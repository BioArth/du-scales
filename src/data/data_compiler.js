"use strict";

var d3 = require('../d3.min.js');
var fs = require('fs');

var multi_data = [
  {data: 'scales-solfego-fr.tsv',   source: {name: "Solfego.fr", url: "http://www.solfego.fr/toutes-les-gammes.htm"}},
  {data: 'scales-guitar-pro-5.tsv', source: {name: "GuitarPro5", url: "https://www.guitar-pro.com/fr/index.php"}},
  {data: 'scales-wikipedia.tsv',    source: {name: "Wikipedia", url: "https://en.wikipedia.org/wiki/List_of_musical_scales_and_modes"}},
  {data: 'scales-harmonics.tsv',    source: {name: "Harmonics.com", url: "http://www.harmonics.com/scales/"}}
];
var codage = JSON.parse(fs.readFileSync('codage.json', 'utf8'));
var packed_data = [];
var data = {
  scales : {},
  intervals : codage.intervals,
  keyboard  : codage.keyboard
};

function packData() {
  multi_data.forEach(readTsv);
  writeData();
};

function readTsv(element, index){
  d3.tsv.parse(fs.readFileSync(element.data, 'utf8'), function(e, i){
    registerScale(e, i, element.source);
  });
};

function onlyUnique(value, index, self) { 
    return self.indexOf(value) === index;
}

function registerScale(element, index, source){
  var code = element.code.split(" ").map(function(value){return codage.source[source.name][value]});
  var i = packed_data.findIndex(function(e){return e.code.toString() === code.toString()});
  if (i === -1) {
    packed_data.push({
      category: code.length + " notes",
      name: element.name.split(",").filter(onlyUnique),
      code: code,
      dualo_code: getCombinations(code),
      source: [source.name]
    });
  } else {
    packed_data[i].name.push(element.name);
    packed_data[i].source.push(source.name);
    packed_data[i].name = packed_data[i].name.filter(onlyUnique);
    packed_data[i].source = packed_data[i].source.filter(onlyUnique);
  };
};

function writeData() {
  data.scales = d3.nest()
    .key(function(d) { return d.category; })
    .sortKeys(function(d) {return d.name})
    .entries(packed_data);
  var content = "var data = " + JSON.stringify(data, null, 2) + ";";
  fs.writeFile("data.js", content, function(err) {
    if(err) {return console.log(err)};
    console.log("data.js successfully compiled.");
  });
  fs.writeFile("data.tsv", d3.tsv.format(packed_data), function(err) {
    if(err) {return console.log(err)};
    console.log("data.tsv successfully compiled.");
  });
};

/* get intervals between values */

function getIntervals(arr) {
  var sorted = arr.slice(0).sort(function(a, b) {return a - b});
  sorted.push(24);
  var result = [];
  for (var i = 1; i < sorted.length; i++) {
    result.push(sorted[i] - sorted[i-1]);
  };
  return result;
};

/* get balance factor between right and left keyboard */

function balance(code) {
  var length = code.length;
  var odd = 0;
  for (var value of code) {
    if (value > 11) {
      odd += 1;
    };
  };
  return Math.abs(0.5 - (length - odd - 1)/(length-1));
};

/* match depreciated intervals */

function balance2(code) {
  return getIntervals(code).some(function(value){return value===1});
};

/* add combinations to data */

function getCombinations(code) {
  var magic = [
    [0,13,14,3,4,17,6,7,20,21,10,11,24],
    [0,13,14,3,4,17,18,7,20,21,10,11,24]
  ];
  var nb_result = code.some(function(i){return i === 6}) ? 2 : 1;
  var result = (nb_result === 2) ? [[],[]] : [[]];
  for (var interval of code) {
    result[0].push(magic[0][interval]);
    if (nb_result === 2) {
      result[1].push(magic[1][interval]);
    };
  };
  if (nb_result === 2) {
    var b = [balance(result[0]),  balance(result[1]),
              balance2(result[0]), balance2(result[1])];
    if (b[0] > b[1] || (b[0] === b[1] && b[2] && !b[3])) {
      result = [result[1], result[0]];
    };
  };
  return result;
};

packData();