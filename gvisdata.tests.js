/**
 * modules
 */

var
qunit = require('./qunit'),
gvisdata = require('./gvisdata');

/**
 * global definitions
 */

var
QUnit = qunit.QUnit,
module = qunit.module,
test = qunit.test,
ok = qunit.ok,
equal = qunit.equal,
deepEqual = qunit.deepEqual,
strictEqual = qunit.strictEqual,
exception = qunit.exception;

var
DataTable = gvisdata.DataTable;

/**
 * output configuration
 */

var sys = require('sys');

QUnit.jsDump.HTML = false;

QUnit.log = function(result, message) {
	if( result == false ) { sys.puts(message+'\n'); }
}

QUnit.testStart = function(name) {
	sys.puts('===== '+name+' =====\n');
}

QUnit.testDone = function(name, failures, total) {
	sys.puts(name+': '+total + ' tests, ' + failures + ' failures.');
}

QUnit.done = function(failures, total) {
	sys.puts('total tests: '+total+' failures: '+failures+'\n');
}

/**
 * tests
 */

module('gvisdata.DataTable');

test('DataTable.singleValueToJS()',function(){
	// We first check that given an unknown type it raises exception
	exception(function(){ DataTable.singleValue(1,'no_such_type'); }
    	,'Exception raised on unknown type');

    // If we give a type which does not match the value, we expect it to fail
	exception(function(){ DataTable.singleValueToJs('a','number'); }
    	,'Exception raised on type mismatch: number.');
	exception(function(){ DataTable.singleValueToJs('b','timeofday'); }
    	,'Exception raised on type mismatch: timeofday.');
	exception(function(){ DataTable.singleValueToJs(10,'date'); }
    	,'Exception raised on type mismatch: date.');

	// A tuple for value and formatted value should be of length 2
	exception(function(){ DataTable.singleValueToJS([5,'5$','6$'],'string'); }
    	,'Exception raised on non-object, third element of first argument');

    // Some good examples from all the different types
	equal(DataTable.singleValueToJS(true, 'boolean'), 'true'
		,'boolean true');
	equal(DataTable.singleValueToJS(false, 'boolean'), 'false'
		,'boolean false');
	equal(DataTable.singleValueToJS(1, 'boolean'), 'true'
		,'boolean 1');
	equal(DataTable.singleValueToJS(null, 'boolean'), 'null'
		,'boolean null');
	deepEqual(DataTable.singleValueToJS([false, 'a'], 'boolean'), ['false',"'a'"]
		,'boolean [false, \'a\']');

	equal(DataTable.singleValueToJS(1,'number'), '1'
		,'number 1');
	// UNSUPPORTED: trailing 0's are not retained in Javascript float conversion
	//equal(DataTable.singleValueToJS(1.0, 'number'), '1.0'
	//	,'number 1.0');
	equal(DataTable.singleValueToJS(1.1, 'number'), '1.1'
		,'number 1.1');
	equal(DataTable.singleValueToJS(-5, 'number'), '-5'
		,'number -5');
	equal(DataTable.singleValueToJS(null, 'number'), 'null'
		,'number null');
	deepEqual(DataTable.singleValueToJS([5, '5$'], 'number'), ['5',"'5$'"]
		,'number [5, \'5$\']');

	equal(DataTable.singleValueToJS(-5, 'string'), "'-5'"
		,'string -5');
	equal(DataTable.singleValueToJS('abc', 'string'), "'abc'"
		,'string \'abc\'');
	equal(DataTable.singleValueToJS(null, 'string'), 'null'
		,'string null');

	equal(DataTable.singleValueToJS(new Date(2010,0,2), 'date'), 'new Date(2010,0,2)'
		,'date Date object');
	equal(DataTable.singleValueToJS(new Date(2001,1,3,4,5,6), 'date'), 'new Date(2001,1,3)'
		,'data Date object with time');

	equal(DataTable.singleValueToJS(null, 'date'), 'null'
		,'date null');

	// UNSUPPORTED: The Javascript version does not support arrays for timeofday values
	// arrays are used in place of tuples for value formatting and custom
	// colomn parameters
	//equal(DataTable.singleValueToJS([10,11,12] , 'timeofday'),'[10,11,12]');
	equal(DataTable.singleValueToJS(new Date(2010, 1, 2, 3, 4, 5), 'timeofday'), '[3,4,5]'
		,'timeofday Date object');
	equal(DataTable.singleValueToJS(null, 'timeofday'), 'null'
		,'timeofday null');

	equal(DataTable.singleValueToJS(new Date(2001,1,3,4,5,6), 'datetime'), 'new Date(2001,1,3,4,5,6)'
		,'datetime Date object');
	equal(DataTable.singleValueToJS(null, 'datetime'), 'null'
		,'datetime null');

	deepEqual(DataTable.singleValueToJS([null, 'null'], 'string'), ['null', "'null'"]
		,'string [null,\'null\']');
});

test('problematic strings', 18, function(){
	// Checking escaping of strings
	var strings = [
		'control', 'new\nline', '', "single'quote", 'double"quote',
		'one\\slash', 'two\\\\slash', 'unicode eng',
		'unicode \u05e2\u05d1\u05e8\u05d9\u05ea'
	];

	var jsValue = '';
	for( var i in strings ) {
		jsValue = DataTable.singleValueToJS(strings[i], "string");
		equal(unescape(eval(jsValue)), strings[i]);

		jsValue = DataTable.singleValueToJS(['str', strings[i]], 'string')[1];
		equal(unescape(eval(jsValue)),strings[i]);
	}
});

test('problematic column parameters', 6, function(){
    // Checking escaping of custom properties
    var params = [
		{control: 'test'}, {unicode: 'value'}, {key: 'unicode'},
		{unicode: 'unicode'}, {regular: "single'quote"}, {unicode: "s'quote"}
	];

	var jsValue = '';
	for( var i in params ) {
		jsValue = DataTable._escapeCustomProperties(params[i]);
		deepEqual(eval('('+unescape(jsValue)+')'), params[i]);
	}
}),

test('DataTable.columnTypeParser()',10,function(){
	// Checking several wrong formats
	exception(function(){DataTable.columnTypeParser(5)}
		,'Exception raised on numeric input');
    exception(function(){DataTable.columnTypeParser(['a', 5, 'c'])}
		,'Exception raised on numeric array element');
	exception(function(){DataTable.columnTypeParser(['a', 'blah'])}
		,'Exception raised on invalid column type');
	exception(function(){DataTable.columnTypeParser(['a', 'number', 'c', 'd'])}
		,'Exception raised on invaled custom properties object');

	// Checking several legal formats
	deepEqual(DataTable.columnTypeParser('abc'),{
    	id: 'abc',
    	label: 'abc',
    	type: 'string',
		custom_properties: {}
	},'');
	deepEqual(DataTable.columnTypeParser(['abc',]),{
		id: 'abc',
		label: 'abc',
		type: 'string',
		custom_properties: {}
	},'');
	deepEqual(DataTable.columnTypeParser(['abc', 'string', 'bcd']),{
		id: 'abc',
		label: 'bcd',
		type: 'string',
		custom_properties: {}
	},'');
	deepEqual(DataTable.columnTypeParser(['a', 'number', 'b']),{
		id: 'a',
		label: 'b',
		type: 'number',
		custom_properties: {}
	},'');
	deepEqual(DataTable.columnTypeParser(['a', 'number']),{
		id: 'a',
		label: 'a',
		type: 'number',
		custom_properties: {}
	},'');
	deepEqual(DataTable.columnTypeParser(['i', 'string', 'l', {key: 'value'}]),{
		id: 'i',
		label: 'l',
		type: 'string',
		custom_properties: {key: 'value'}
	},'');
});

test('DataTable.tableDescriptionParser',function(){
	// We expect it to fail with empty lists or dictionaries
	exception(function(){ Datatable.tableDescriptionParser({}); }
		,'Raises exception on empty object input');
	exception(function(){ Datatable.tableDescriptionParser([]); }
		,'Raises exception on empty array input');
	exception(function(){ Datatable.tableDescriptionParser({a: []}); }
		,'Raises exception on empty sub-column array description');
	exception(function(){ DataTable.tableDescriptionParser({a: {b: {}}}); }
		,'Raises exception on empty sub-column object description');

    // We expect it to fail if we give a non-string at the lowest level
	exception(function(){ DataTable.tableDescriptionParser({a: 5}); }
		,'Raises exception on numeric column definition in object');
	exception(function(){ DataTable.tableDescriptionParser([['a', 'number'], 6]); }
		,'Raises exception on numeric column definition in array');

    // Some valid examples which mixes both dictionaries and lists
	deepEqual(DataTable.tableDescriptionParser([['a', 'date'], ['b', 'timeofday']]), [
		{id: 'a', label: 'a', type: 'date', depth: 0, container: 'iter', custom_properties: {}},
		{id: 'b', label: 'b', type: 'timeofday', depth: 0, container: 'iter', custom_properties: {}}
	], 'depth 1 array definition');
	deepEqual(DataTable.tableDescriptionParser({a: [['b', 'number'], ['c', 'string', 'column c']]}), [
		{id: 'a', label: 'a', type: 'string', depth: 0, container: 'dict', custom_properties: {}},
		{id: 'b', label: 'b', type: 'number', depth: 1, container: 'iter', custom_properties: {}},
		{id: 'c', label: 'column c', type: 'string', depth: 1, container: 'iter', custom_properties: {}}
	], 'depth 2 mixed object/array definition');
	deepEqual(DataTable.tableDescriptionParser({a: ['number', 'column a'],b: ['string', 'column b']}), [
		{id: 'a', label: 'column a', type: 'number', depth: 0, container: 'dict', custom_properties: {}},
		{id: 'b', label: 'column b', type: 'string', depth: 0, container: 'dict', custom_properties: {}}
	], 'depth 1 mixed obect/array definition');
	deepEqual(DataTable.tableDescriptionParser({a: ['number', 'column a'],b: ['string', 'column b']}), [
		{id: 'a', label: 'column a', type: 'number', depth: 0, container: 'dict', custom_properties: {}},
		{id: 'b', label: 'column b', type: 'string', depth: 0, container: 'dict', custom_properties: {}}
	], 'depth 1 mixed obect/array definition');
	// UNSUPPORTED: non-string object properties are not supported in Javascript
	//deepEqual(DataTable.tableDescriptionParser({['a', 'number', 'column a']:{b: 'number', c: 'string'}}), [
	//	{id: 'a', label: 'column a', type: 'number', depth: 0, container: 'dict', custom_properties: {}},
	//	{id: 'b', label: 'b', type: 'number', depth: 1, container: 'dict', custom_properties: {}},
	//	{id: 'c', label: 'c', type: 'string', depth: 1, container: 'dict', custom_properties: {}}
	//], 'depth 2 object property in object defenition');
	//deepEqual(DataTable.tableDescriptionParser({['a', 'number', 'column a']:['b', 'string', 'column b']}), [
	//	{id: 'a', label: 'column a', type: 'number', depth: 0, container: 'dict', custom_properties: {}},
	//	{id: 'b', label: 'column b', type: 'string', depth: 1, container: 'scalar', custom_properties: {}},
	//], 'depth 2 object property in object/array defenition');

    // Cases that might create ambiguity
	deepEqual(DataTable.tableDescriptionParser({a: ['number', 'column a']}), [
		{id: 'a', label: 'column a', type: 'number', depth: 0, container: 'dict', custom_properties: {}}
	], 'depth 2 object property in object/array definition');
	exception(function(){ DataTable.tableDescriptionParser({a: ['b', 'number']}); }
		,'column key/value mismatch');
	deepEqual(DataTable.tableDescriptionParser({a: ['b', 'number', 'b', {}]}), [
		{id: 'a', label: 'a', type: 'string', depth: 0, container: 'dict', custom_properties: {}},
		{id: 'b', label: 'b', type: 'number', depth: 1, container: 'scalar', custom_properties: {}},
	], 'depth 2 ambiguous mixed object/array definition');
	// UNSUPPORTED: non-string object properties are not supported in Javascript
	//deepEqual(DataTable.tableDescriptionParser({['a',]: ['b', 'number']}), [
	//	{id: 'a', label: 'a', type: 'string', depth: 0, container: 'dict', custom_properties: {}},
	//	{id: 'b', label: 'b', type: 'number', depth: 1, container: 'scalar', custom_properties: {}},
	//], 'depth 2 ambiguous object property in object/array definition');
});

test('appendData',function(){
	// We check a few examples where the format of the data does not match the
	// description and then a few valid examples. The test for the content itself
	// is done inside the toJSCode and toJSon functions.

	var table = new DataTable([["a", "number"], ["b", "string"]]);
	equal(table.numberOfRows(), 0, 'Number of rows is 0');
	exception(function(){ table.appendData([[1,"a", true]]); }
		,'Raises exception on too many columns');
	exception(function(){ table.appendData({1: ['a'], 2: ['b']}); }
		,'Raises exception on wrong data type for column in object');
 	equal(table.appendData([[1,'a'],[2, 'b']]), null, '');
	equal(table.numberOfRows(),2,'Column count is 2');
	equal(table.appendData([[3, 'c'],[4]]), null, '');
	equal(table.numberOfRows(), 4, 'Column count is 4');

	var table = new DataTable({a: 'number', b: 'string'});
	equal(table.numberOfRows(), 0, 'Number of rows is 0');
	exception(function(){ table.appendData([[1, 'a']]); }
		,'Raises exception on ...');
	exception(function(){ table.appendData({5: {b: 'z'}}); }
		,'Raises exception on ...');
	equal(table.appendData([{a: 1, b: 'z'}]), null, '');
	equal(table.numberOfRows(), 1, '');

	// UNSUPPORTED: non-string object properties are not supported in Javascript
	//table = new DataTable({['a', 'number]:  [['b', 'string']]});
	//equal(table.numberOfRows(), 0, 'Number of rows is 0');
	//exception(function(){ table.appendData([[1, 'a']]); }
	//	,'');
	//exception(function(){ table.appendData({5: {b: 'z'}}); }
	//	,'');
	//equal(table.appendData({5: ['z'], 6: ['w']}), null, '');
	//equal(table.numberOfRows(), 2, '');

	// UNSUPPORTED: non-string object properties are not supported in Javascript
	//table = new DataTable({('a', 'number'): {b: 'string', c: 'number'}});
	//equal(table.numberOfRows(), 0, 'Number of rows is 0');
	//exception(function(){ table.appendData([[1, 'a']]); }
	//	,'');
	//exception(function(){ table.appendData({1: ['a', 2]}); }
	//	,'');
	//equal(table.appendData({5: {b: 'z', c: 6},
	//                        7: {c: 8},
	//                        9: {}}), null, '');
	//equal(table.numberOfRows(), 3, '');
});

test('toJSCode',function(){
	var table = new DataTable([
		['a', 'number', "A'"], 
		"b'", 
		['c', 'timeofday']
	],[
		[1],
		[null, 'z', new Date(0,0,0,1, 2, 3)],
		[[2, '2$'], 'w', new Date(0,0,0,2, 3, 4)]
	]);
	equal(table.numberOfRows(),3,'Has three rows after initialization');
    equal(table.toJSCode("mytab"),
    	("var mytab = new google.visualization.DataTable();\n"+
			"mytab.addColumn('number', \"A'\", 'a');\n"+
			"mytab.addColumn('string', \"b'\", \"b'\");\n"+
			"mytab.addColumn('timeofday', 'c', 'c');\n"+
			"mytab.addRows(3);\n"+
			"mytab.setCell(0, 0, 1);\n"+
			"mytab.setCell(1, 1, 'z');\n"+
			"mytab.setCell(1, 2, [1,2,3]);\n"+
			"mytab.setCell(2, 0, 2, '2$');\n"+
			"mytab.setCell(2, 1, 'w');\n"+
			"mytab.setCell(2, 2, [2,3,4]);\n")
		,'Outputs correct Javascript representation');

	// UNSUPPORTED: non-string object properties are not supported in Javascript
	//table = new DataTable({['a', 'number']: {'b': 'date', 'c': 'datetime'}},
	//	{1: {},
	//	2: {'b': new Date(0,0,0,1, 2, 3)},
	//	3: {'c': new Date(1, 2, 3, 4, 5, 6)}});
	//equal(table.NumberOfRows(),3);
	//equal(table.ToJSCode("mytab2", columns_order=["c", "b", "a"],
	//	("var mytab2 = new google.visualization.DataTable();\n"
	//		"mytab2.addColumn('datetime', 'c', 'c');\n"
	//		"mytab2.addColumn('date', 'b', 'b');\n"
	//		"mytab2.addColumn('number', 'a', 'a');\n"
	//		"mytab2.addRows(3);\n"
	//		"mytab2.setCell(0, 2, 1);\n"
	//		"mytab2.setCell(1, 1, new Date(1,1,3));\n"
	//		"mytab2.setCell(1, 2, 2);\n"
	//		"mytab2.setCell(2, 0, new Date(1,1,3,4,5,6));\n"
	//		"mytab2.setCell(2, 2, 3);\n")
	//	,'');
});

test('toJSON',function(){
	// The json of the initial data we load to the table.
	// FIXME this json is invalid
	var init_data_json = ("{cols:"+
		"[{id:'a',label:'A',type:'number'},"+
		"{id:'b',label:'b',type:'string'},"+
		"{id:'c',label:'c',type:'boolean'}],"+
		"rows:["+
		"{c:[{v:1},,{v:null}]},"+
		"{c:[,{v:'z'},{v:true}]}"+
		"]}");
		
 	var table = new DataTable([['a', 'number', 'A'], 'b', ['c', 'boolean']],
		[[1],[null, 'z', true]]);
	equal(table.numberOfRows(),2,'');
	deepEqual(table.toJSON(),init_data_json,'');
	
	table.appendData([[-1, 'w', false]]);
	equal(table.numberOfRows(),3, '');
	equal(table.toJSON(),
		init_data_json.substring(0,init_data_json.length-2)
		+",{c:[{v:-1},{v:'w'},{v:false}]}]}",'');

	// UNSUPPORTED: non-string object properties are not supported in Javascript
	//var cols_json = ("{cols:"+
	//	"[{id:'t',label:'T',type:'timeofday'},"+
	//	"{id:'d',label:'d',type:'date'},"+
	//	"{id:'dt',label:'dt',type:'datetime'}],");
	//table = new DataTable({['d', 'date']: [['t', 'timeofday', 'T'],['dt', 'datetime']]});
	//table.loadData({new Date(1, 2, 3): [new Date(0,0,0,1, 2, 3)]});
	//equal.(table.numberOfRows(),1,'');
	//equal(table.toJSON(['t', 'd', 'dt']),
	//	cols_json+"rows:[{c:[{v:[1,2,3]},{v:new Date(1,1,3)},{v:null}]}]}");
	//table.loadData({new Date(2, 3, 4): [[new Date(0,0,0,2, 3, 4), "time 2 3 4"],
	//	new Date(1, 2, 3, 4, 5, 6)],
	//	new Date(3, 4, 5): []});
	//equal(table.numberOfRows,2,'');
	//equal(table.toJSON(['t', 'd', 'dt']),cols_json+
	//	"{c:[{v:[2,3,4],f:'time 2 3 4'},{v:new Date(2,2,4)},"+
	//	"{v:new Date(1,1,3,4,5,6)}]},"+
	//	"{c:[,{v:new Date(3,3,5)},{v:null}]}]}",'');

	// FIXME this json is invalid
	var json = ("{cols:[{id:\"a'\",label:\"a'\",type:'string'},"+
		"{id:'b',label:\"bb'\",type:'number'}],"+
		"rows:[{c:[{v:'a1'},{v:1}]},{c:[{v:'a2'},{v:2}]},"+
		"{c:[{v:'a3'},{v:3}]}]}");
	table = new DataTable({"a'": ['b', 'number', "bb'", {}]},
		{a1: 1, a2: 2, a3: 3});
	equal(table.numberOfRows(),3);
	equal(table.toJSON(),json);
});

test('custom properties',function(){
	// The json of the initial data we load to the table.
	// FIXME this json is invalid
	var json = ("{cols:"+
		"[{id:'a',label:'A',type:'number',p:{'col_cp':'col_v'}},"+
		"{id:'b',label:'b',type:'string'},"+
		"{id:'c',label:'c',type:'boolean'}],"+
		"rows:["+
		"{c:[{v:1},,{v:null,p:{'null_cp':'null_v'}}],p:{'row_cp':'row_v'}},"+
		"{c:[,{v:'z',p:{'cell_cp':'cell_v'}},{v:true}]},"+
		"{c:[{v:3},,{v:null}],p:{'row_cp2':'row_v2'}}],"+
		"p:{'global_cp':'global_v'}"+
		"}");
	var jscode = ("var mytab = new google.visualization.DataTable();\n"+
		"mytab.setTableProperties({'global_cp':'global_v'});\n"+
		"mytab.addColumn('number', 'A', 'a');\n"+
		"mytab.setColumnProperties(0, {'col_cp':'col_v'});\n"+
		"mytab.addColumn('string', 'b', 'b');\n"+
		"mytab.addColumn('boolean', 'c', 'c');\n"+
		"mytab.addRows(3);\n"+
		"mytab.setCell(0, 0, 1);\n"+
		"mytab.setCell(0, 2, null, null, {'null_cp':'null_v'});\n"+
		"mytab.setRowProperties(0, {'row_cp':'row_v'});\n"+
		"mytab.setCell(1, 1, 'z', null, {'cell_cp':'cell_v'});\n"+
		"mytab.setCell(1, 2, true);\n"+
		"mytab.setCell(2, 0, 3);\n"+
		"mytab.setRowProperties(2, {'row_cp2':'row_v2'});\n");

    var table = new DataTable([
			['a', 'number', 'A', {col_cp: 'col_v'}], 
			"b",
			['c', 'boolean']
		], null, {global_cp: 'global_v'});
    table.appendData([[1, null, [null, null, {null_cp: 'null_v'}]]],{row_cp: 'row_v'});
    table.appendData([[null, ['z', null, {cell_cp: 'cell_v'}], true], [3]]);
    table.setRowsCustomProperties(2, {row_cp2: 'row_v2'});
    equal(table.toJSON(), json, 'Correct JSON output');
    equal(table.toJSCode("mytab"), jscode, 'Correct JSCode output');
});

test('toCSV',function(){
	var init_data_csv = ['"A", "b", "c"','1, "", ""','"", "zz\'top", true'].join('\n');
	var table = new DataTable([['a', 'number', 'A'], 'b', ['c', 'boolean']],
		[[[1, '$1']], [null, "zz'top", true]]);
	equal(table.toCSV(),init_data_csv);	
	table.appendData([[-1, 'w', false]]);
	equal(table.toCSV(),init_data_csv+'\n-1, "w", false');

	// UNSUPPORTED: non-string object properties are not supported in Javascript
	//init_data_csv = [
	//	'"T", "d", "dt"',
	//	'"[1,2,3]", "new Date(1,1,3)", ""',
	//	'"time ""2 3 4""", "new Date(2,2,4)", "new Date(1,1,3,4,5,6)"',
	//	'"", "new Date(3,3,5)", ""'].join('\n');
	//table = new DataTable({['d', 'date']: [['t', 'timeofday', 'T'],
	//	['dt', 'datetime']]});
	//table.loadData({new Date(1, 2, 3): [new Date(1,2,3,1, 2, 3)],
	//	new Date(2, 3, 4): [[new Date(1,2,4,2, 3, 4), 'time "2 3 4"'],
	//		new Date(1, 2, 3, 4, 5, 6)],
	//	new Date(3, 4, 5): []});
	//equal(table.ToCsv(["t", "d", "dt"]), init_data_csv);
});

test('toTSVExcel',function(){
	// UNSUPPORTED: non-string object properties are not supported in Javascript
	//var table = new DataTable({['d', 'date']: [['t', 'timeofday', 'T'],
	//                                   ['dt', 'datetime']]});
	//table.loadData({new Date(1, 2, 3): [new Date(1,2,3,1, 2, 3)],
	//                new Date(2, 3, 4): [[new Date(2,3,4,2, 3, 4), 'time "2 3 4"'],
	//                                 new Date(1, 2, 3, 4, 5, 6)],
	//                new Date(3, 4, 5): []})
	//equal(table.toTSVExcel(),table.toCSV().replace(", ", "\t")/*.encode("UTF-16LE")*/);
});

test('toHTML',function(){
	var html_table_header = "<html><body><table border='1'>";
	var html_table_footer = "</table></body></html>";
	var init_data_html = html_table_header + (
		"<thead><tr>"+
		"<th>A&lt;</th><th>b&gt;</th><th>c</th>"+
		"</tr></thead>"+
		"<tbody>"+
		"<tr><td>'$1'</td><td></td><td></td></tr>"+
		"<tr><td></td><td>'&lt;z&gt;'</td><td>true</td></tr>"+
		"</tbody>") + html_table_footer;
    var table = new DataTable([['a', 'number', 'A<'], 'b>', ['c', 'boolean']],
                      [[[1, '$1']], [null, '<z>', true]]);
	equal(table.toHTML(), init_data_html.replace("\n", ""));

	// UNSUPPORTED: non-string object properties are not supported in Javascript
	//var init_data_html = html_table_header + (
	//	"<thead><tr>"+
	//	"<th>T</th><th>d</th><th>dt</th>"+
	//	"</tr></thead>"+
	//	"<tbody>"+
	//	"<tr><td>[1,2,3]</td><td>new Date(1,1,3)</td><td></td></tr>"+
	//	"<tr><td>'time 2 3 4'</td><td>new Date(2,2,4)</td>"+
	//	"<td>new Date(1,1,3,4,5,6)</td></tr>"+
	//	"<tr><td></td><td>new Date(3,3,5)</td><td></td></tr>"+
	//	"</tbody>") + html_table_footer;
	//var table = new DataTable({['d', 'date']: [['t', 'timeofday', 'T'],
	//	['dt', 'datetime']]});
	//table.loadData({new Date(1, 2, 3): [new Date(1,2,3,1, 2, 3)],
	//                new Date(2, 3, 4): [[new Date(2,3,4,2, 3, 4), "time 2 3 4"],
	//                                new Date(1, 2, 3, 4, 5, 6)],
	//                new Date(3, 4, 5): []});
	//equal(table.toHTML(['t', 'd', 'dt']),init_data_html.replace("\n", ""))         
});

test('orderBy',function(){
	var data = [['b', 3], ['a', 3], ['a', 2], ['b', 1]];
	var description = ['col1', ['col2', 'number', 'Second Column']];
	var table = new DataTable(description, data);

	var first = DataTable._o.clone(data);
    var numSorted = new DataTable(description,first.sort(function(a,b){
    	if ( a[1] == b[1] ) { return a[0] < b[0] ? -1 : 1; }
    	else { return a[1] < b[1] ? -1 : 1; }
    	return 0;
	}));
    
	var second = DataTable._o.clone(data);
	var strSorted = new DataTable(description,second.sort(function(a,b){
		return 	a[0] == b[0] ? 0 : a[0] < b[0] ? -1 : 1;
	}));
	
	var third = DataTable._o.clone(data);
	var diffSorted = new DataTable(description,third.sort(function(a,b){
		return 	a[1] == b[1] ? 0 : a[1] > b[1] ? -1 : 1;	
	}).sort(function(a,b){
		return 	a[0] == b[0] ? 0 : a[0] > b[0] ? -1 : 1;	
	}));

	equal(table.toJSON(null,['col2', 'col1']), numSorted.toJSON());
	equal(table.toJSCode('mytab',null,['col2', 'col1']), numSorted.toJSCode('mytab'));

	equal(table.toJSON(null,'col1'), strSorted.toJSON());
	equal(table.toJSCode('mytab',null,'col1'), strSorted.toJSCode('mytab'));

	equal(table.toJSON(null,[['col1', 'desc'], 'col2']), diffSorted.toJSON());
	equal(table.toJSCode('mytab',null,[['col1', 'desc'], 'col2']), diffSorted.toJSCode('mytab'));
});

test('toJSONResponse',function(){
	var description = ['col1', 'col2', 'col3'];
	var data = [['1', '2', '3'], ['a', 'b', 'c'], ['One', 'Two', 'Three']];
	var req_id = 4;
	var table = new DataTable(description, data);

	var start_str_default = 'google.visualization.Query.setResponse';
	var start_str_handler = 'MyHandlerFunction';
	var default_params = ("'version':'0.6', 'reqId':'%s', 'status':'OK'"
		.replace('%s',req_id));
	var regex1 = new RegExp("%s\\\(\\\{%s, 'table': \\\{(.*)\\\}\\\}\\\);"
		.replace('%s',start_str_default).replace('%s',default_params));
	var regex2 = new RegExp("%s\\\(\\\{%s, 'table': \\\{(.*)\\\}\\\}\\\);"
		.replace('%s',start_str_handler).replace('%s',default_params));

	var json_str = table.toJSON();
	
	var json_response = table.toJSONResponse(null,null,req_id);
	var m = regex1.exec(json_response);
	equal(m.length, 2);
	// We want to match against the json_str without the curly brackets.
	equal(m[1], json_str.substr(1,json_str.length-2));

	json_response = table.toJSONResponse(null,null,req_id,start_str_handler);
	m = regex2.exec(json_response);
	equal(m.length, 2);
	// We want to match against the json_str without the curly brackets.
	equal(m[1], json_str.substr(1,json_str.length-2));	
});

test('toResponse',function(){
	var description = ['col1', 'col2', 'col3'];
	var data = [['1', '2', '3'], ['a', 'b', 'c'], ['One', 'Two', 'Three']];
	var table = new DataTable(description, data);
	
	equal(table.toResponse(), table.toJSONResponse());
	equal(table.toResponse(null,null,'out:csv'), table.toCSV());
	equal(table.toResponse(null,null,'out:html'), table.toHTML());
	exception(function(){table.toResponse(null,null,'version:0.1');},
		'Raises exception on invalid version');
	equal(table.toResponse(null,null,'reqId:4;responseHandler:handle'),
		table.toJSONResponse(null,null,4,'handle'));
	equal(table.toResponse(null,null,'out:csv;reqId:4'), table.toCSV());
	equal(table.toResponse(null,'col2'), table.toJSONResponse(null,'col2'));
	equal(table.toResponse(['col3','col2','col1'],null,'out:html'),
		table.toHTML(['col3','col2','col1']));
	exception(function(){table.toResponse(null,null,'SomeWrongTqxFormat')},
		'Raises exception on invalid tqx');
	exception(function(){table.toResponse(null,null,'out:bad');},
		'Raises exception on invalid format');
});

/**
 * The following tests are not part of the gv-python test suite
 */
 
test('DataTable.singleValueToJS - extra',function(){
	equal(DataTable.singleValueToJS('<<','string'),"'<<'",'< is not escaped');
	equal(DataTable.singleValueToJS('>>','string'),"'>>'",'> is not escaped');
	equal(DataTable.singleValueToJS('$$','string'),"'$$'",'$ is not escaped');
});

test('toJSCode - extra',function(){
	var table = new DataTable([['a'], ['b'], ['c']],[
		['foo','bar','baz'],
		['red','green','blue'],
		['one','two','three']
	]);
	equal(table.numberOfRows(),3,'Has three rows after initialization');
    equal(table.toJSCode("mytab",['c', 'b', 'a']),
    	("var mytab = new google.visualization.DataTable();\n"+
			"mytab.addColumn('string', 'c', 'c');\n"+
			"mytab.addColumn('string', 'b', 'b');\n"+
			"mytab.addColumn('string', 'a', 'a');\n"+
			"mytab.addRows(3);\n"+
			"mytab.setCell(0, 0, 'baz');\n"+
			"mytab.setCell(0, 1, 'bar');\n"+
			"mytab.setCell(0, 2, 'foo');\n"+
			"mytab.setCell(1, 0, 'blue');\n"+
			"mytab.setCell(1, 1, 'green');\n"+
			"mytab.setCell(1, 2, 'red');\n"+
			"mytab.setCell(2, 0, 'three');\n"+
			"mytab.setCell(2, 1, 'two');\n"+
			"mytab.setCell(2, 2, 'one');\n")
		,'Outputs correct Javascript representation with column ordering');
});

test('toTSVExcel - extra',function(){
	var table = new DataTable({a: [['t', 'timeofday', 'T'],['dt', 'datetime']]});
	table.loadData({1: [new Date(1,2,3,1, 2, 3)],
	                2: [[new Date(2,3,4,2, 3, 4), 'time "2 3 4"'],new Date(1, 2, 3, 4, 5, 6)],
	                3: []})
	equal(table.toTSVExcel(),table.toCSV().replace(/, /g, "\t"));
});

test('_isColumnDesc',function(){
	ok(!DataTable._isColumnDesc([['a', 'number', 'A'], 'b', ['c', 'boolean']]));
	ok(DataTable._isColumnDesc(['a', 'number', 'A']));
	ok(DataTable._isColumnDesc(['c', 'boolean']));	
});

test('type detection',function(){
	var _t = DataTable._t;

	ok(_t.isObject({}), 'Object literal is an object');
	equal(_t.isString({}), false, 'Object literal is not a string');
	equal(_t.isArray({}), false, 'Object literal is not an array');

	ok(_t.isString(new String('test')), 'String object is a string');
	ok(_t.isString('test'), 'String literal is a string');

	ok(_t.isArray(new Array()), 'Array object is an array');
	ok(_t.isArray([]), 'Array literal is an array');

	ok(_t.isDate(new Date()), 'Date object is a date');

	equal(_t.type({}), 'object', 'type of object literal');
	equal(_t.type('test'), 'string', 'type of string literal');
	equal(_t.type(new String('test')), 'string', 'type of string object');
	equal(_t.type(new Array()), 'array', 'type of Array object');
	equal(_t.type([]), 'array', 'type of array literal');
	equal(_t.type(new Date()), 'date', 'type of Date object');
	equal(_t.type(false),'boolean', 'type of false is boolean');
});

test('object enhancement', function(){
	var _o = DataTable._o;

	deepEqual(_o.prop({a: 'x', b: 'y', c: 'z'}), ['a','b','c'], 'Object properties');
	deepEqual(_o.val({a: 'x', b: 'y', c: 'z'}), ['x','y','z'], 'Object values');
	
	var obj1 = {a: 'x', b: 'y', c: ['a','b','c'], d: {a: 1, b: 2}};
	var obj2 = _o.clone(obj1);
	deepEqual(obj1, {a: 'x', b: 'y', c: ['a','b','c'], d: {a: 1, b: 2}}
		,'clone source is unaltered');
	deepEqual(obj2, {a: 'x', b: 'y', c: ['a','b','c'], d: {a: 1, b: 2}}
		,'clone is the same');

	obj2.a = 'a';
	deepEqual(obj2, {a: 'a', b: 'y', c: ['a','b','c'], d: {a: 1, b: 2}}
		,'changes affect the clone');
	deepEqual(obj1, {a: 'x', b: 'y', c: ['a','b','c'], d: {a: 1, b: 2}}
		,'changes don\'t alter the source');	
});


