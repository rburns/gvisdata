/**
 * modules
 */
 
var 
sys = require('sys'),
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
	equal(DataTable.singleValueToJS(1.0, 'number'), '1.0'
		,'number 1.0');
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

// FIXME: I'm not certain these tests are equivalent to the relevant Python tests
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

// FIXME: I'm not certain these tests are equivalent to the relevant Python tests
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
	var table = new DataTable([("a", "number"), ("b", "string")]);
});

/** 
 * The following tests are not part of the Python test suite
 */
 
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
});

