/**
 * Wraps the data to convert to a Google Visualization API DataTable.
 * 
 * Create this object, populate it with data, then call one of the ToJS...
 * methods to return a string representation of the data in the format described.
 * 
 * You can clear all data from the object to reuse it, but you cannot clear
 * individual cells, rows, or columns. You also cannot modify the table schema
 * specified in the class constructor.
 * 
 * You can add new data one or more rows at a time. All data added to an
 * instantiated DataTable must conform to the schema passed in to __init__().
 * 
 * You can reorder the columns in the output table, and also specify row sorting
 * order by column. The default column order is according to the original
 * table_description parameter. Default row sort order is ascending, by column
 * 1 values. For a dictionary, we sort the keys for order.
 * 
 * The data and the table_description are closely tied, as described here:
 * 
 * The table schema is defined in the class constructor's table_description
 * parameter. The user defines each column using a tuple of
 * (id[, type[, label[, custom_properties]]]). The default value for type is
 * string, label is the same as ID if not specified, and custom properties is
 * an empty dictionary if not specified.
 * 
 * table_description is a dictionary or list, containing one or more column
 * descriptor tuples, nested dictionaries, and lists. Each dictionary key, list
 * element, or dictionary element must eventually be defined as
 * a column description tuple. Here's an example of a dictionary where the key
 * is a tuple, and the value is a list of two tuples:
 * {('a', 'number'): [('b', 'number'), ('c', 'string')]}
 * 
 * This flexibility in data entry enables you to build and manipulate your data
 * in a Javascript structure that makes sense for your program.
 * 
 * Add data to the table using the same nested design as the table's
 * table_description, replacing column descriptor tuples with cell data, and
 * each row is an element in the top level collection. This will be a bit
 * clearer after you look at the following examples showing the
 * table_description, matching data, and the resulting table:
 * 
 * Columns as list of tuples [col1, col2, col3]
 *   table_description: [('a', 'number'), ('b', 'string')]
 *   AppendData( [[1, 'z'], [2, 'w'], [4, 'o'], [5, 'k']] )
 *   Table:
 *   a  b   <--- these are column ids/labels
 *   1  z
 *   2  w
 *   4  o
 *   5  k
 * 
 * Dictionary of columns, where key is a column, and value is a list of
 * columns  {col1: [col2, col3]}
 *   table_description: {('a', 'number'): [('b', 'number'), ('c', 'string')]}
 *   AppendData( data: {1: [2, 'z'], 3: [4, 'w']}
 *   Table:
 *   a  b  c
 *   1  2  z
 *   3  4  w
 * 
 * Dictionary where key is a column, and the value is itself a dictionary of
 * columns {col1: {col2, col3}}
 *   table_description: {('a', 'number'): {'b': 'number', 'c': 'string'}}
 *   AppendData( data: {1: {'b': 2, 'c': 'z'}, 3: {'b': 4, 'c': 'w'}}
 *   Table:
 *   a  b  c
 *   1  2  z
 *   3  4  w
 */ 




/**
 * Initialize the data table from a table schema and (optionally) data.
 * 
 * See the class documentation for more information on table schema and data
 * values.
 * 
 * Args:
 *   table_description: A table schema, following one of the formats described
 *                      in TableDescriptionParser(). Schemas describe the
 *                      column names, data types, and labels. See
 *                      TableDescriptionParser() for acceptable formats.
 *   data: Optional. If given, fills the table with the given data. The data
 *         structure must be consistent with schema in table_description. See
 *         the class documentation for more information on acceptable data. You
 *         can add data later by calling AppendData().
 *   custom_properties: Optional. A dictionary from string to string that
 *                      goes into the table's custom properties. This can be
 *                      later changed by changing self.custom_properties.
 * 
 * Raises:
 *   DataTableException: Raised if the data and the description did not match,
 *                       or did not use the supported formats.
 */
function DataTable(tableDescription, data, customProperties) {
	this._columns = DataTable.tableDescriptionParser(tableDescription);
	this._data = [];
	this.customProperties = {};

	if( arguments.length > 2 && customProperties != null ) {
		this.custom_properties = customProperties;
	}
	if( arguments.length > 1 && data != null ) {
		this.LoadData(data);
	}
} 

/**
 * Translates a single value and type into a JS value.
 * 
 * Internal helper method.
 * 
 * Args:
 *  value: The value which should be converted
 *  type: One of "string", "number", "boolean", "date", "datetime" or
 *              "timeofday".
 *  escapeFn: The function to use for escaping strings.
 * 
 * Returns:
 *  The proper JS format (as string) of the given value according to the
 *  given value_type. For null, we simply return "null".
 *  If an array is given, it should be in one of the following forms:
 *   - (value, formatted value)
 *   - (value, formatted value, custom properties)
 *  where the formatted value is a string, and custom properties is a
 *  dictionary of the custom properties for this cell.
 *  To specify custom properties without specifying formatted value, one can
 *  pass null as the formatted value.
 *  One can also have a null-valued cell with formatted value and/or custom
 *  properties by specifying null for the value.
 *  This method ignores the custom properties except for checking that it is a
 *  dictionary. The custom properties are handled in the ToJSon and ToJSCode
 *  methods.
 *  The real type of the given value is not strictly checked. For example,
 *  any type can be used for string - as we simply convert it with String() and for
 *  boolean value we just check "if( value )".
 *  Examples:
 *    singleValueToJS(null, "boolean") returns "null"
 *    singleValueToJS(False, "boolean") returns "false"
 *    singleValueToJS((5, "5$"), "number") returns ("5", "'5$'")
 *    singleValueToJS((null, "5$"), "number") returns ("null", "'5$'")
 * 
 * Raises:
 *   DataTableException: The value and type did not match in a not-recoverable
 *                       way, for example given value 'abc' for type 'number'.
 */
DataTable.singleValueToJS = function(value, type, escapeFn) {
	if( arguments.length < 3 ) { escapeFn = DataTable._escapeValue; }
	var _t = DataTable._t;
	
	if( _t.isArray(value) ) {
		var len = value.length;
		// In case of an array, we run the same function on the value itself and
		// add the formatted value.
		if( (len != 2 && len != 3) || (len == 3 && !_t.isObject(value[2])) ) {
			throw 'Wrong format for value and formatting - ' + value;
		}
		if( !_t.isString(value[1]) && value[1] != null ) {
			throw 'Formatted value is not string, given ' + typeof(value[1]);
		}
		js_value = DataTable.singleValueToJS(value[0], type);
		if( value[1] == null ) {
			return [js_value, null];
		}
		return [js_value, escapeFn(value[1])];
	}
	
	// The standard case - no formatting.
	t_value = _t.type(value);
	if( value == null ) {
		return 'null';
	}
	if( type == 'boolean' ) {
		if( value ) { return 'true' };
		return 'false';
	}
	if( type == 'number' ) {
		if( t_value == 'number') { return String(value); }
		throw 'Wrong type '+ t_value +' when expected number';
	}
	if( type == 'string' ) {
		if( t_value == 'array' ) { throw 'Arrays are not allowed as string values'; }
		return escapeFn(value);
	}
	if( type == 'date') {
		if( t_value != 'date' ) { throw 'Wrong type '+t_value+' when expected Date'; }
		var details = [
			value.getFullYear(),
			value.getMonth(),
			value.getDate(),
		];
		return 'new Date('+details.join(',')+')';
	}
	if( type == 'timeofday' ) {
		if( t_value != 'date' ) { throw 'Wrong type '+t_value+' when expected Date'; }
		var details = [
			value.getHours(),
			value.getMinutes(),
			value.getSeconds()
		];
		return '['+details.join(',')+']';
	}
	if( type == 'datetime' ) {
		if( t_value != 'date' ) { throw 'Wrong type '+t_value+' when expected datetime'; }
		var details = [
			value.getFullYear(),
			value.getMonth(),
			value.getDate(),
			value.getHours(),
			value.getMinutes(),
			value.getSeconds()
		]
		return 'new Date('+details.join(',')+')';
	}

	// If we got here, it means the given value_type was not one of the
	// supported types.
	throw 'Unsupported type '+type;
};

/**
 * Parses a single column description. Internal helper method.
 * 
 * Args:
 *   description: a column description in the possible formats:
 *    'id'
 *    ['id',]
 *    ['id', 'type')
 *    ['id', 'type', 'label']
 *    ['id', 'type', 'label', {custom_prop1: 'custom_val1'}]
 * Returns:
 *   Object with the following properties: id, label, type, and
 *   custom_properties where:
 *     - If label not given, it equals the id.
 *     - If type not given, string is used by default.
 *     - If custom properties are not given, an empty object is used by
 *       default.
 * 
 * Raises:
 *   DataTableException: The column description did not match the RE, or
 *       unsupported type was passed.
 */
DataTable.columnTypeParser = function(description) {
	var _t = DataTable._t;
	
	if( arguments.length < 1 || !description ) { 
		throw 'Description error: empty description given'; 
	}

	t_desc = _t.type(description);
	if( t_desc != 'array' && t_desc != 'string' ) {
		throw 'Description error: expected either string or array, got '+t_desc;
	}
	
	if( t_desc == 'string' ) { description = [description,]; }

	// According to the array's length, we fill the keys
	// We verify everything is of type string
	for( var i in description.slice(0,2) ) {
		if( !_t.isString(description[i]) ) {
			throw 'Description error: expected array of strings '+
				'current element of type '+ _t.type(description[i]);
		}
	}

	descDict = {
		id: description[0],
		label: description[0],
		type: 'string',
		custom_properties: {}
	}

	if( description.length > 1 ) {
		descDict.type = description[1].toLowerCase();
		if( description.length > 2 ) {
    		descDict.label = description[2];
			if( description.length > 3 ) {
				if( !_t.isObject(description[3]) ) {
					throw 'Description error: expected custom properties object, '+
						'current element of type '+_t.type(description[3]);
				}
				descDict.custom_properties = description[3];
				if( description.length > 4 ) {
					throw 'Description error: array of length > 4';					
				}
			}
		}
	}		

	var validTypes = ["string", "number", "boolean","date", "datetime", "timeofday"];
	if( !validTypes.some(function(e){ return e == descDict.type; }) ) {
		throw 'Description error: unsupported type \''+descDict.type+'\'';		
	}
	
	return descDict;
};

/**
 * Parses the table_description object for internal use.
 * 
 * Parses the user-submitted table description into an internal format used
 * by the Python DataTable class. Returns the flat list of parsed columns.

 * Args:
 *   table_description: A description of the table which should comply
 *                      with one of the formats described below.
 *   depth: Optional. The depth of the first level in the current description.
 *          Used by recursive calls to this function.
 * 
 * Returns:
 *   List of columns, where each column represented by a dictionary with the
 *   keys: id, label, type, depth, container which means the following:
 *   - id: the id of the column
 *   - name: The name of the column
 *   - type: The datatype of the elements in this column. Allowed types are
 *           described in ColumnTypeParser().
 *   - depth: The depth of this column in the table description
 *   - container: 'dict', 'iter' or 'scalar' for parsing the format easily.
 *   - custom_properties: The custom properties for this column.
 *   The returned description is flattened regardless of how it was given.
 * 
 * Raises:
 *   DataTableException: Error in a column description or in the description
 *                       structure.
 * 
 * Examples:
 *   A column description can be of the following forms:
 *    'id'
 *    ('id',)
 *    ('id', 'type')
 *    ('id', 'type', 'label')
 *    ('id', 'type', 'label', {'custom_prop1': 'custom_val1'})
 *    or as a dictionary:
 *    'id': 'type'
 *    'id': ('type',)
 *    'id': ('type', 'label')
 *    'id': ('type', 'label', {'custom_prop1': 'custom_val1'})
 *   If the type is not specified, we treat it as string.
 *   If no specific label is given, the label is simply the id.
 *   If no custom properties are given, we use an empty dictionary.
 * 
 *   input: [('a', 'date'), ('b', 'timeofday', 'b', {'foo': 'bar'})]
 *   output: [{'id': 'a', 'label': 'a', 'type': 'date',
 *             'depth': 0, 'container': 'iter', 'custom_properties': {}},
 *            {'id': 'b', 'label': 'b', 'type': 'timeofday',
 *             'depth': 0, 'container': 'iter',
 *             'custom_properties': {'foo': 'bar'}}]
 * 
 *   input: {'a': [('b', 'number'), ('c', 'string', 'column c')]}
 *   output: [{'id': 'a', 'label': 'a', 'type': 'string',
 *             'depth': 0, 'container': 'dict', 'custom_properties': {}},
 *            {'id': 'b', 'label': 'b', 'type': 'number',
 *             'depth': 1, 'container': 'iter', 'custom_properties': {}},
 *            {'id': 'c', 'label': 'column c', 'type': 'string',
 *             'depth': 1, 'container': 'iter', 'custom_properties': {}}]
 * 
 *   input:  {('a', 'number', 'column a'): { 'b': 'number', 'c': 'string'}}
 *   output: [{'id': 'a', 'label': 'column a', 'type': 'number',
 *             'depth': 0, 'container': 'dict', 'custom_properties': {}},
 *            {'id': 'b', 'label': 'b', 'type': 'number',
 *             'depth': 1, 'container': 'dict', 'custom_properties': {}},
 *            {'id': 'c', 'label': 'c', 'type': 'string',
 *             'depth': 1, 'container': 'dict', 'custom_properties': {}}]
 *    input: { ('w', 'string', 'word'): ('c', 'number', 'count') }
 *    output: [{'id': 'w', 'label': 'word', 'type': 'string',
 *             'depth': 0, 'container': 'dict', 'custom_properties': {}},
 *            {'id': 'c', 'label': 'count', 'type': 'number',
 *             'depth': 1, 'container': 'scalar', 'custom_properties': {}}]
 * 
 *   input: {'a': ('number', 'column a'), 'b': ('string', 'column b')}
 *   output: [{'id': 'a', 'label': 'column a', 'type': 'number', 'depth': 0,
 *            'container': 'dict', 'custom_properties': {}},
 *            {'id': 'b', 'label': 'column b', 'type': 'string', 'depth': 0,
 *            'container': 'dict', 'custom_properties': {}}
 * 
 *   NOTE: there might be ambiguity in the case of a dictionary representation
 *   of a single column. For example, the following description can be parsed
 *   in 2 different ways: {'a': ('b', 'c')} can be thought of a single column
 *   with the id 'a', of type 'b' and the label 'c', or as 2 columns: one named
 *   'a', and the other named 'b' of type 'c'. We choose the first option by
 *   default, and in case the second option is the right one, it is possible to
 *   make the key into a tuple (i.e. {('a',): ('b', 'c')}) or add more info
 *   into the tuple, thus making it look like this: {'a': ('b', 'c', 'b', {})}
 *   -- second 'b' is the label, and {} is the custom properties field.
 */
DataTable.tableDescriptionParser = function(tableDescription, depth) {
	if( arguments.length < 2 ) { depth = 0; }
	var _t = DataTable._t;
	var _o = DataTable._o;

	// For the recursion step, we check for a string or an array of strings
	// which are assumed to not be column definitions
	if( _t.isString(tableDescription) || ( _t.isArray(tableDescription) &&
		_t.isString(tableDescription[0]) && tableDescription.length < 5) ) {
		var parsedCol = DataTable.columnTypeParser(tableDescription);
		parsedCol.depth = depth;
		parsedCol.container = 'scalar';
		return [parsedCol];
	}

	// Since it is not a string, table_description must be iterable.
	if( !_t.isArray(tableDescription) && !_t.isObject(tableDescription) ) {
		throw 'Expected an iterable object, got '+_t.type(tableDescription);			
	}
	if( _t.type(tableDescription) != 'object' ) {
		// We expect an array.
		columns = [];
		for( i in tableDescription ) {
			var parsedCol = DataTable.columnTypeParser(tableDescription[i]);
			parsedCol.depth = depth
			parsedCol.container = 'iter';
			columns.push(parsedCol);
		}
    		if( columns.length == 0 ) {
			throw 'Description iterable objects should not be empty.';      		
    		}
		return columns;
	}

	// The other case is an object
	if( _o.prop(tableDescription).length == 0 ) {
		throw 'Empty objects are not allowed inside description';
	}

	// To differentiate between the two cases of more levels below or this is
	// the most inner object, we consider the number of properties (more then one
	// property is indication for most inner object) and the type of the property and
	// value in case of only 1 property (if the type of the property is string and the type of
	// the value is an array of 0-3 items, we assume this is the most inner object).
	// NOTE: this way of differentiating might create ambiguity. See docs.
	if( _o.prop(tableDescription).length != 1 ||
		(_t.isArray(_o.val(tableDescription)[0]) &&
		_t.isString(_o.val(tableDescription)[0][0]) &&
		_o.val(tableDescription)[0].length < 4 ) ) {
		// This is the most inner object. Parsing types.
		columns = [];
		for( var i in tableDescription ) {
			// We parse the column type as (key, type) or (key, type, label)
			// using columnTypeParser.
			var parsedCol = {};
			if( _t.isArray(tableDescription[i]) ) {
				tableDescription[i].unshift(i);
				parsedCol = DataTable.columnTypeParser(tableDescription[i]);
			} else {
				parsedCol = DataTable.columnTypeParser([i, tableDescription[i]]);
			}
			parsedCol.depth = depth;
			parsedCol.container = 'dict';
			columns.push(parsedCol);
		}
		return columns;
	}

	// This is an outer dictionary, must have at most one key.
	var parsedCol = DataTable.columnTypeParser(_o.prop(tableDescription)[0]);
	parsedCol.depth = depth;
	parsedCol.container = 'dict';

	var result = DataTable.tableDescriptionParser(_o.val(tableDescription)[0],depth + 1)
	result.unshift(parsedCol);
	return result;
};

// Puts the string in quotes, and escapes any inner quotes and slashes.	
DataTable._escapeValue = function(v) {
	// FIXME: This code is incorrect. I'm not certain what does and doesn't need escaped
	/* if isinstance(v, unicode):
		# Here we use repr as in the usual case, but on unicode strings, it
		# also escapes the unicode characters (which we want to leave as is).
		# So, after repr() we decode using raw-unicode-escape, which decodes
		# only the unicode characters, and leaves all the rest (", ', \n and
		# more) escaped.
		# We don't take the first character, because repr adds a u in the
		# beginning of the string (usual repr output for unicode is u'...').
		return repr(v).decode("raw-unicode-escape")[1:] */
	// Here we use Javascript's built-in escaping mechanism for string using escape().
	return "'"+escape(String(v)).replace('%24','$')+"'";
};

// Escapes the custom properties dictionary.	
DataTable._escapeCustomProperties = function(properties) {
	l = [];
	for( var key in properties ) {
		l.push(DataTable._escapeValue(key)+':'+DataTable._escapeValue(properties[key]));
	}
	return '{'+l.join(',')+'}';
};

// type detection
DataTable._t = {
	type: function(v){
		if( this.isString(v) ) return 'string';
		if( this.isArray(v) ) return 'array';
		if( this.isDate(v) ) return 'date';
		if( this.isObject(v) ) return 'object';
		return typeof(v);
	},
	hasConstructor: function(obj,c){
		if( typeof(obj) != 'object' ) return false;
		if( obj !== null ) {
			return obj.constructor.toString().match(new RegExp(c)) ? true : false;
		}
		return false;
	},
	isObject: function(v){
		if( typeof(v) == 'object' ) return true;
		return false;
	},
	isString: function(v){
		if( typeof(v) == 'string' ) return true;
 		return this.hasConstructor(v,'String');
	},
	isDate: function(v){
 		return this.hasConstructor(v,'Date');	
	},
	isArray: function(v){
		return this.hasConstructor(v,'Array');
	}
};

// object enhancement
DataTable._o = {
	val: function(obj) {
		if( typeof(obj) != 'object' ) { return []; }
		var result = [];
		for( prop in obj ) { result.push(obj[prop]); }
		return result;
	},
	prop: function(obj) {
		if( typeof(obj) != 'object' ) { return []; }
		var result = [];
		for( prop in obj ) { result.push(prop); }
		return result;			
	}
};

exports.DataTable = DataTable;

