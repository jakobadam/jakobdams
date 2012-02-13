dojo.require('dojox.data.CsvStore');
dojo.require('dojo.data.ItemFileWriteStore');
dojo.require('dojox.grid.DataGrid');

dojo.require("dijit.form.TextBox");
dojo.require("dijit.form.Button");

if (window.File && window.FileReader && window.FileList && window.Blob) {
    // Great success! All the File APIs are supported.
} else {
    alert('The File APIs are not fully supported in this browser. Try Google Chrome');
}

CSV_SEPERATOR = '|';
CSV_FIELDS = ['address', 'distance', 'lat', 'lng'];

function onFileLoaded(text){}
function onFileParsed(store){}
function onGeocoded(store){}
function onDistance(store){}

function handleFileSelect(evt) {

    var files = evt.target.files; // FileList object
    var file = files[0];

    var reader = new FileReader();
    reader.onloadend = function(evt) {
      if (evt.target.readyState == FileReader.DONE) {
          onFileLoaded(evt.target.result);
      }
    };
    reader.readAsText(file);
}

function parseCsv(text){
    var items = [];
    var lines = text.split('\n');
    dojo.forEach(lines, function(l){
        if(l === ''){
            return false;
        }
        var fields = l.split(CSV_SEPERATOR);
        var item = {};
        for(var i = 0; i < fields.length; i++){
            item[CSV_FIELDS[i]] = fields[i];
        }
        items.push(item);
    });
    store = new dojo.data.ItemFileWriteStore({data: {items:items}});
    onFileParsed();
}

function createGrid(){
    var grid = new dojox.grid.DataGrid({
        store: store,
        structure: [
            {field:'address', width:'300px'}, 
            {field:'distance', width:'100px'}]
    }, 'grid');
    grid.startup();
}

function mapItem(item){
    var pos = new google.maps.LatLng(store.getValue(item, 'lat'), store.getValue(item, 'lng'));
    var marker = new google.maps.Marker({
        map: map,
        position: pos
    });
}

function geocode() {
    var geocoder = new google.maps.Geocoder();
    store.fetch({
        onItem: function(item){
            var lat = store.getValue(item, 'lat');
            var lng = store.getValue(item, 'lng');

            if(lat && lng){
                mapItem(item);
            }
            else{
                geocoder.geocode({ 'address': store.getValue(item, 'address')}, function(results, status) {
                  if (status == google.maps.GeocoderStatus.OK) {
                      var location = results[0].geometry.location;
                      store.setValue(item, 'lat', location.lat());
                      store.setValue(item, 'lng', location.lng());
                      mapItem(item);
                  } else {
                    alert("Geocode was not successful for the following reason: " + status);
                  }
                });
            }
        },
        onComplete: function(){
            dojo.fadeIn({node:'results_wrapper'}).play();
            createGrid();
            onGeocoded();
        }});
}

function distance(){
    var dst = dojo.byId('dst').value;
    if(!dst){
        alert('Please supply a destination!');
        return;
    }
    var destinations = [dst];

    store.fetch({
        onComplete: function(items){
            var service = new google.maps.DistanceMatrixService();

            dojo.forEach(items, function(i){
                var origins = [store.getValue(i, 'address')];

                function onDistance(response, status){
                    store.setValue(i, 'distance', response.rows[0].elements[0].distance.value);
                }

                service.getDistanceMatrix({
                    origins: origins,
                    destinations: destinations,
                    travelMode: google.maps.TravelMode.DRIVING
                }, onDistance);
            });
        }
    });
}

function downloadResults(){

    store.fetch({
        sort: [{ attribute: "distance"}],
        onComplete: function(items){
            var bb = new WebKitBlobBuilder();
            dojo.forEach(items, function(item){
                bb.append(dojo.replace('{address}|{distance}|{lat}|{lng}\n', item));
            });
            var blobURL = window.webkitURL.createObjectURL(bb.getBlob());
            // var blobURL = window.URL.createObjectURL(bb.getBlob());
            window.location.href = blobURL;
        }
    });

    // Obtain a blob URL reference to our worker 'file'.
    // Note: window.webkitURL.createObjectURL() in Chrome 10+.

}

dojo.ready(
    function(){

        var myOptions = {
            center: new google.maps.LatLng(56.2, 10.1),
            zoom: 10,
            mapTypeId: google.maps.MapTypeId.ROADMAP
        };
        map = new google.maps.Map(document.getElementById("map_canvas"), myOptions);
        store = null;

        var dst = new dijit.form.TextBox({
            value:"Skejby Sygehus, Brendstrupgårdsvej, Århus N, Denmark",
            style: 'width:100%'
        }, 'dst');
        
        dojo.connect(dojo.byId('file'), 'change', handleFileSelect);
        dojo.connect('onFileLoaded', 'parseCsv');
        dojo.connect('onFileParsed', 'geocode');
        dojo.connect('onGeocoded', 'distance');
        dojo.connect(dojo.byId('download'), 'onclick', 'downloadResults');
});
