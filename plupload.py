#!/usr/bin/python
#
# upload.py
#
# Copyright 2010, Cabo Communications
# Released under GPL License.

"""Handles uploads from plupload.
"""
import hashlib
import os

from google.appengine.ext.webapp.util import run_wsgi_app

from werkzeug import Request
from werkzeug import Response
from werkzeug import secure_filename
from werkzeug.exceptions import BadRequest
from werkzeug.exceptions import HTTPException

from google.appengine.api import memcache

URLENCODED = 'application/x-www-form-urlencoded'
UPLOAD_DIR = 'uploads'

def write_meta_information_to_memcache(meta_key, md5sum, chunk, chunks):
    """Writes meta info about the upload, i.d., md5sum, chunk number ...

    :param meta_file: file to write to
    :param md5sum: checksum of all uploaded chunks
    :param chunk: chunk number
    :param chunks: total chunk number
    """
    if chunk < (chunks - 1):
        upload_meta_data = "status=uploading&chunk=%s&chunks=%s&md5=%s" % (chunk,chunks,md5sum)
        memcache.add(meta_key, upload_meta_data)
    else:
        memcache.delete(meta_key)

def clean_filename(filename):
    i = filename.rfind(".")
    if i != -1:
        filename = filename[0:i] + filename[i:].lower()
    return secure_filename(filename)

def upload_with_checksum(request, md5chunk, md5total, chunk, chunks):
    """Save application/octet-stream request to file.

    :param dst: the destination filepath
    :param chunk: the chunk number
    :param chunks: the total number of chunks
    :param md5chunk: md5sum of chunk
    :param md5total: md5sum of all currently sent chunks
    """
    filename = clean_filename(request.args['name'])
    dst = os.path.join(UPLOAD_DIR,filename)

    buf_len = int(request.args['chunk_size'])
    buf = request.stream.read(buf_len)

    md5 = hashlib.md5()
    md5.update(buf)
    if md5.hexdigest() != md5chunk:
        raise BadRequest("Checksum error")

    # f = get_or_create_file(chunk, dst)
    # f.write(buf)
    # f.close()

    meta_key = dst
    write_meta_information_to_memcache(meta_key, md5total, chunk, chunks)
    return filename

# def get_or_create_file(chunk, dst):
#     if chunk == 0:
#         f = file(dst, 'wb')
#     else:
#         f = file(dst, 'ab')
#     return f

def upload_simple(request, dst, chunk=0):
    tmp_file_stream = request.files['file']

    filename = clean_filename(tmp_file_stream.filename)
    # dst = os.path.join(UPLOAD_DIR,filename)
    # f = get_or_create_file(chunk, dst)
    # ...

    return filename

def upload(request):
    """Handle uploads from the different runtimes.

    HTTP query args:
    :param name: the filename
    :param chunk: the chunk number
    :param chunks: the total number of chunks
    :param md5chunk: md5sum of chunk (optional)
    :param md5total: md5sum of all currently sent chunks (optional)
    """
    if request.method != "POST":
        return probe(request)

    md5chunk = request.args.get('md5chunk', False)
    md5total = request.args.get('md5total', False)

    chunk = int(request.args.get('chunk', 0))
    chunks = int(request.args.get('chunks', 0))

    if md5chunk and md5total:
        filename = upload_with_checksum(request, md5chunk, md5total, chunk, chunks)
    else:
        filename = upload_simple(request, chunk)

    return Response('%s uploaded' % filename)

def probe(request):
    filename = clean_filename(request.args['name'])

    dst = os.path.join(UPLOAD_DIR, filename)
    meta = memcache.get(dst)
    if(meta):
        return Response(meta, content_type=URLENCODED)
    else:
        return Response("status=unknown", content_type=URLENCODED)

@Request.application
def app(request):
    try:
        return upload(request)
    except HTTPException, e:
        return e

def main():
    run_wsgi_app(app)

if __name__ == "__main__":
    main()
