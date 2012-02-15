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

if(typeof WebKitBlobBuilder !== 'undefined'){
    BlobBuilder = WebKitBlobBuilder;
}
else if(typeof MozBlobBuilder !== 'undefined'){
    BlobBuilder = MozBlobBuilder;    
}
else{
    alert('You will not be able to download csv file since BlobBuilder is not supported by browser! Try Firefox or Chrome');
}

if(typeof window.URL === 'undefined'){
    if(typeof window.webkitURL !== 'undefined'){
        window.URL = window.webkitURL;
    }
    else{
        alert('You will not be able to download csv file since BlobBuilder is not fully supported by browser! Try Firefox or Chrome');
    }
}



CSV_SEPERATOR = '|';
CSV_FIELDS = ['cpr', 'address', 'distance', 'lat', 'lng'];

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
            {field:'cpr', width:'70px'}, 
            {field:'address', width:'270px'}, 
            {field:'distance', width:'90px'}]
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

function convert2csv(items){
    var results = [];
    dojo.forEach(items, function(item){
        var line = dojo.replace('{cpr}|{address}|{distance}|{lat}|{lng}', item);
        // remove all newlines
        line = line.replace('\n', '');
        results.push(line);
    });
    return results.join('\n');
}

function downloadResults(){
    store.fetch({
        sort: [{attribute: 'distance'}],
        onComplete: function(items){
            var csv = convert2csv(items);
            var bb = new BlobBuilder();
            bb.append(csv);
            var blobURL = window.URL.createObjectURL(bb.getBlob());
            window.location.href = blobURL;
        }            
    });
}

function showResults (text) {
    store.fetch({
        sort: [{attribute: 'distance'}],
        onComplete: function(items){
            var csv = convert2csv(items);
            dojo.byId('results_area').innerHTML = csv;
        }
    });
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
        dojo.connect(dojo.byId('show'), 'onclick', 'showResults');
});
