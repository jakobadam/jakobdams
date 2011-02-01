# -*- coding: utf-8 -*-
import os

from google.appengine.ext import webapp
from google.appengine.ext.webapp.util import run_wsgi_app
from google.appengine.ext.webapp import template

TEMPLATE_DIR = "templates"
MAIL = "jakob.a.dam@gmail.com"

def render(file_name, handler, **values):
    path = os.path.join(TEMPLATE_DIR, file_name)
    handler.response.headers['Content-Type'] = 'text/html'
    values['config'] = {
        'host': os.environ['HTTP_HOST']
        }
    handler.response.out.write(template.render(path, values))

class Page(webapp.RequestHandler):
    def get(self):
        path = os.environ['PATH_INFO'].rstrip("/").lstrip("/")
        if path == "":
            path = "index"
        render("%s.html" % (path), self)

application = webapp.WSGIApplication([
        ('^.*$', Page)
        ],debug=True)

def main():
    run_wsgi_app(application)

if __name__ == "__main__":
    main()
