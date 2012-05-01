require([
"dojox/data/CsvStore",
"dojo/text!dijit/templates/Dialog.html"
], 
function(CsvStore){
    var points = new dojox.data.CsvStore({data: peopleData2, separator: '|'});
});