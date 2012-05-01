require([
"dojo/dom",
"dojo/ready",
"dojox/data/CsvStore",
"dojo/text!/static/js/heli/emergencies.csv"
], 
function(dom, ready, CsvStore, csvData){

    var g = google.maps;

    var points = new CsvStore({data:csvData, identifier:'pid', separator:"|"});

    var mapArgs = {
        center: new g.LatLng(56.2, 9.5),
        zoom: 9,
        mapTypeId: g.MapTypeId.TERRAIN
    };


    var getColor = function(item){
        var duration = points.getValue(item, 'duration');
        if(duration < 120){
            return "#00FF00";
        }
        else if(duration >= 120 || duration <= 150){
            return "#0000FF";
        }
        else{
            return "#FF0000";
        }
    };

    window.heli = 0;

    var getRadius = function(item){
        var helicopter = points.getValue(item, 'helicopter');

        if(helicopter == 1){
            heli++;
            return 2500;
        }
        else{
            return 1000;
        }
    };

    ready(function(){
        var map = new g.Map(dom.byId("map_canvas"), mapArgs);

        points.fetch({onItem: function(item){

            var lat = points.getValue(item, 'lat');
            var lon = points.getValue(item, 'lon');
            var rereferred = points.getValue(item, 'rereferred');
            
            if(!lat || !lon){
                console.log('skipping', lat, lon, item);
                return;
            }
            var color = getColor(item);
        
            var args = {
                strokeWeight:0,
                fillColor: color,
                fillOpacity: 0.35,
                map: map,
                center: new g.LatLng(lat, lon),
                radius: getRadius(item)
            };

            if(rereferred > 0){
                args.strokeWeight = 2;
                args.strokeColor = color;
                args.strokeOpacity = 0.8;
            }
        
            new g.Circle(args);
        }});            


    });
    
    window.points = points;


});