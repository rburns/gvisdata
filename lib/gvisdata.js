/**
 * Wraps the data to convert to a Google Visualization API DataTable.
 *
 * Create this object, populate it with data, then call one of the ToJS...
 * methods to return a string representation of the data in the format described.
 *
 * You can clear all data from the object to reuse it, but you cannot clear
 * individual cells, rows, or columns. You also cannot modify the table schema
 * specified in the constructor.
 *
 * You can add new data one or more rows at a time. All data added to an
 * instantiated DataTable must conform to the schema passed in to the constructor
 *
 * You can reorder the columns in the output table, and also specify row sorting
 * order by column. The default column order is according to the original
 * tableDescription parameter. Default row sort order is ascending, by column
 * 1 values.
 *
 * The data and the tableDescription are closely tied, as described here:
 *
 * The table schema is defined in the constructor's tableDescription
 * parameter. The user defines each column using an array of
 * [id,type,label,custom properties]. The default value for type is
 * string, label is the same as ID if not specified, and customProperties is
 * an empty dictionary if not specified.
 *
 * tableDescription is an object or array, containing one or more column
 * descriptor arrays, nested objects, and arrays. Each obejct property, array
 * element, or object element must eventually be defined as
 * a column description array. 
 *
 * This flexibility in data entry enables you to build and manipulate your data
 * in a Javascript structure that makes sense for your program.
 *
 * Add data to the table using the same nested design as the table's
 * tableDescription, replacing column descriptor arrays with cell data, and
 * each row as an element in the top level collection. This will be a bit
 * clearer after you look at the following examples showing the
 * tableDescription, matching data, and the resulting table:
 *
 * Columns as array of arrays
 *   tableDescription: [['a', 'number'], ['b', 'string']]
 *   appendData( [[1, 'z'], [2, 'w'], [4, 'o'], [5, 'k']] )
 *   Table:
 *   a  b   <--- these are column ids/labels
 *   1  z
 *   2  w
 *   4  o
 *   5  k
 */




/**
 * Initialize the data table from a table schema and (optionally) data.
 *
 * Args:
 *   tableDescription: A table schema, following one of the formats described
 *                     in DataTable.tableDescriptionParser(). Schemas describe the
 *                     column names, data types, and labels. See
 *                     DataTable.tableDescriptionParser() for acceptable formats.
 *   data: Optional. If given, fills the table with the given data. The data
 *         structure must be consistent with schema in tableDescription. See
 *         the constructor documentation for more information on acceptable data. You
 *         can add data later by calling appendData().
 *   customProperties: Optional. An object that describes the table's custom 
 *                     properties This can be later changed by changing 
 *                     this.customProperties.
 *
 * Throws an exception if the data and the description did not match, or did not
 * use the supported formats.
 */
function DataTable(tableDescription, data, customProperties) {
	/**
	 * Loads new rows to the data table, clearing existing rows.
	 * 
	 * May also set the customProperties for the added rows. The given custom
	 * properties object specifies the custom properties that will be used for 
	 * *all* given rows.
	 * 
	 * Args:
	 *   data: The rows that the table will contain.
	 *   customProperties: An object describing the custom properties for 
	 *                     all rows.
	 */
	this.loadData = function(data, customProperties) {
		if( arguments.length < 2 ) { customProperties = null; }

		this._data = [];
		this.appendData(data, customProperties);
	};

	/**
	 * Appends new data to the table.
	 *
	 * Data is appended in rows. Data must comply with
	 * the table schema passed in to the constructor. See DataTable.singleValueToJS()
	 * for a list of acceptable data types. See the Contructor documentation for more 
	 * information and examples of schema and data values.
	 *
	 * Args:
	 *  data: The row to add to the table. The data must conform to the table
	 *        description format.
	 *  customProperties: An object representing the custom properties to add to all
	 *  the rows.
	 *
	 * Throws an exception if the data structure does not match the description.
	 */
	this.appendData = function(data, customProperties) {
		if( arguments.length < 2 ) { customProperties = null; }

		// If the maximal depth is 0, we simply iterate over the data table
		// lines and insert them using _innerAppendData. Otherwise, we simply
		// let the _innerAppendData handle all the levels.
		if( !(this._columns[this._columns.length-1].depth) ) {
			for( i in data ) {
			    // replicating python specific behaviour
				var element = DataTable._t.isArray(data) ? data[i] : i;
				this._innerAppendData([{},customProperties], element, 0)
			}
		} else {
			this._innerAppendData([{},customProperties], data, 0)
		}
	};

	// Inner function to assist LoadData.
	this._innerAppendData = function(prevColValues, data, colIndex){
		// We first check that colIndex has not exceeded the columns size
		if( colIndex >= this._columns ) {
			throw 'The data does not match description, too deep';
		}

		// Dealing with the scalar case, the data is the last value.
		if( this._columns[colIndex].container == 'scalar' ) {
			prevColValues[0][this._columns[colIndex].id] = data;
			this._data.push(prevColValues);
			return;
		}

		if( this._columns[colIndex].container == 'iter' ) {
			if( !DataTable._t.isArray(data) ) {
				throw 'Expected iterable object, got '+DataTable._t.type(data);
			}

			// We only need to insert the rest of the columns
			// If there are less items than expected, we only add what there is.
			for( i in data ) {
				if( colIndex >= this._columns.length ) {
					throw 'Too many elements given in data';
				}
				prevColValues[0][this._columns[colIndex]['id']] = data[i];
				colIndex += 1;
			}
			this._data.push(prevColValues);
			return;
		}

		// We know the current level is an object, we verifiy the type
		if( !DataTable._t.isObject(data) || DataTable._t.isArray(data) ) {
			throw 'Expected dictionary at current level, got '+DataTable._t.type(data);
		}

		// We check if this is the last level
		if( this._columns[colIndex].depth == this._columns[this._columns.length -1].depth ) {
			// We need to add the properties in the object as they are
			for( key in this._columns[colIndex] ) {
				var curId = this._columns[colIndex][key].id;
				if( data[curId] != null ) {
					prevColValues[0][curId] = data[curId];
				}
			}
			this._data.push(prevColValues);
			return;
		}
	
		// We have an object in an inner depth level.
		if( DataTable._o.prop(data).length == 0 ) {
			// In case this is an empty object, we add a record with the columns
			// filled only until this point.
			this._data.push(prevColValues);
		} else {
			for( key in data ) {
				var colValues = DataTable._o.clone(prevColValues[0]);
				colValues[this._columns[colIndex].id] = key;
				this._innerAppendData([colValues, prevColValues[1]], data[key], colIndex + 1);
			}		
		}
	};

	// Returns the number of rows of data stored in the table
	this.numberOfRows = function() {
		return this._data.length;
	};

	/**
	 * Sets the custom properties for given row(s).
	 * 
	 * Can accept a single row or an array of rows.
	 * Sets the given custom properties for all specified rows.
	 * 
	 * Args:
	 *   rows: The row, or rows, to set the custom properties for.
	 *   customProperties: An object of custom properties to set for all rows.
	 */
	this.setRowsCustomProperties = function(rows,customProperties) {
		if( !DataTable._t.isArray(rows) && !DataTable._t.isObject(rows) ) { rows = [rows]; }
		for( i in rows ) {
			this._data[rows[i]] = [this._data[rows[i]][0], customProperties];
		}
	};

	/**
	 * Prepares the data for enumeration - sorting it by orderBy.
	 * 
	 * Args:
	 *   orderBy: Optional. Specifies the name of the column(s) to sort by, and
	 *            (optionally) which direction to sort in. Default sort direction
	 *            is asc. Following formats are accepted:
	 *             'string_col_name'  -- For a single key in default (asc) order.
	 *             ['string_col_name', 'asc|desc'] -- For a single key.
	 *             [['col_1','asc|desc'], ['col_2','asc|desc']] -- For more than
	 *              one column, an array of arrays of [col_name, "asc|desc"].
	 * 
	 * Returns:
	 *   The data sorted by the keys given.
	 * 
	 * Throws an exception if sort direction is not 'asc' or 'desc'
	 */
	this.preparedData = function(orderBy) {
		if( arguments.length == 0 || orderBy == null ) { orderBy = [] }

		if( !(orderBy.length) ) { return this._data; }

		properSortKeys = [];
		if( DataTable._t.isString(orderBy) ||
			(DataTable._t.isArray(orderBy && orderBy.length == 2) &&
			(orderBy[1].toLowerCase() == 'asc' || orderBy[1].toLowerCase() == 'desc')) ) {
			orderBy = [orderBy,];
		}

		for( i in orderBy ) {
			if( DataTable._t.isString(orderBy[i]) ) {
				properSortKeys.push([orderBy[i], 1]);
			} else if((DataTable._t.isArray(orderBy[i]) && orderBy[i].length == 2) &&
				(orderBy[i][1].toLowerCase() == 'asc' || orderBy[i][1].toLowerCase() == 'desc')) {
				properSortKeys.push([orderBy[i][0], orderBy[i][1].toLowerCase() == 'asc' ? 1 : -1]);
			} else {
				throw 'Expected array with second value: \'asc\' or \'desc\'';
			}			
		}

		return DataTable._o.clone(this._data).sort(function(row1,row2){
			for( i in properSortKeys ) {
				var key = properSortKeys[i][0],
					ascMult = properSortKeys[i][1];
				var a = row1[0][key],
					b = row2[0][key];
				var cmpResult = ascMult * (a == b ? 0 : a < b ? -1 : 1);
				if( cmpResult ) { return cmpResult; }
			}
			return 0;
		});
	};

	/**
	 * Writes the data table as a JS code string.
	 * 
	 * This method writes a string of JS code that can be run to
	 * generate a DataTable with the specified data. Typically used for debugging
	 * only.
	 * 
	 * Args:
	 *   name: The name of the table. The name would be used as the DataTable's
	 *         variable name in the created JS code.
	 *   columnOrder: Optional. Specifies the order of columns in the
	 *                output table. Specify a list of all column IDs in the order
	 *                in which you want the table created.
	 *                Note that you must list all column IDs in this parameter,
	 *                if you use it.
	 *   orderBy: Optional. Specifies the name of the column(s) to sort by.
	 *            Passed as is to _preparedData().
	 * 
	 * Returns:
	 *   A string of JS code that, when run, generates a DataTable with the given
	 *   name and the data stored in the DataTable object.
	 *   Example result:
	 *     "var tab1 = new google.visualization.DataTable();
	 *      tab1.addColumn('string', 'a', 'a');
	 *      tab1.addColumn('number', 'b', 'b');
	 *      tab1.addColumn('boolean', 'c', 'c');
	 *      tab1.addRows(10);
	 *      tab1.setCell(0, 0, 'a');
	 *      tab1.setCell(0, 1, 1, null, {'foo': 'bar'});
	 *      tab1.setCell(0, 2, true);
	 *      ...
	 *      tab1.setCell(9, 0, 'c');
	 *      tab1.setCell(9, 1, 3, '3$');
	 *      tab1.setCell(9, 2, false);"
	 * 
	 * Throws an exception if the data does not match the type.
	 */
	this.toJSCode = function(name, columnOrder, orderBy) {
		if( arguments.length == 1 || columnOrder == null ) {
			var columnOrder = [];
			for( i in this._columns ) {	columnOrder.push(this._columns[i].id); }
		}
		var colDict = {};
		for( i in this._columns ) { colDict[this._columns[i].id] = this._columns[i]; }

		// We first create the table with the given name
		var jscode = 'var '+name+' = new google.visualization.DataTable();\n';
		if( DataTable._o.prop(this.customProperties).length ) {
			var props = DataTable._escapeCustomProperties(this.customProperties);
			jscode += name+'.setTableProperties('+props+');\n';
		}
		
		// We add the columns to the table
		for( i in columnOrder ) {
			var col = columnOrder[i],
				type = colDict[col].type,
          		label = DataTable._escapeValue(colDict[col].label),
          		id = DataTable._escapeValue(colDict[col].id);

			jscode += name+".addColumn('"+type+"', "+label+", "+id+");\n";
			
			if( DataTable._o.prop(colDict[col].custom_properties).length ) {
				var props = DataTable._escapeCustomProperties(colDict[col].custom_properties);
				jscode += name+'.setColumnProperties('+i+', '+props+');\n';
			}
		}
		jscode += name+'.addRows('+this._data.length+');\n';

		// We now go over the data and add each row
		var prepData = this.preparedData(orderBy);
		for( i in prepData ) {
			var row = prepData[i][0],
				cp = prepData[i][1];
			// We add all the elements of this row by their order
			for( j in columnOrder ) {
				var coli = j,
					col = columnOrder[j];
				if( !row || row[col] == null ) { continue; }
				var cellCp = '';
				if( DataTable._t.isArray(row[col]) && row[col].length == 3 ) {
					cellCp = ', '+DataTable._escapeCustomProperties(row[col][2]);
				}
				var value = DataTable.singleValueToJS(row[col], colDict[col].type);
				if( DataTable._t.isArray(value) ) {
					// We have a formatted value or custom property as well
					if( value[1] == null ) { value = [value[0], 'null']; }
					jscode += name+'.setCell('+i+', '+j+', '+value[0]+', '+value[1]+cellCp+');\n';
				} else {
					jscode += name+'.setCell('+i+', '+j+', '+value+');\n';
				}
			}
			if( DataTable._o.prop(cp).length ) {
				jscode += name+'.setRowProperties('+i+', '+DataTable._escapeCustomProperties(cp)+');\n';
			}
		}
		
		return jscode;
	};

	/**
	 * Writes a JSON string that can be used in a JS DataTable constructor.
	 * 
	 * This method writes a JSON string that can be passed directly into a Google
	 * Visualization API DataTable constructor. Use this output if you are
	 * hosting the visualization HTML on your site, and want to code the data
	 * table in Python. Pass this string into the
	 * google.visualization.DataTable constructor, e.g,:
	 *   ... on my page that hosts my visualization ...
	 *   google.setOnLoadCallback(drawTable);
	 *   function drawTable() {
	 *     var data = new google.visualization.DataTable(_my_JSon_string, 0.6);
	 *     myTable.draw(data);
	 *  }
	 * 
	 * Args:
	 *   columnOrder: Optional. Specifies the order of columns in the
	 *                output table. Specify a list of all column IDs in the order
	 *                in which you want the table created.
	 *                Note that you must list all column IDs in this parameter,
	 *                if you use it.
	 *   orderBy: Optional. Specifies the name of the column(s) to sort by.
	 *            Passed as is to _preparedData().
	 * 
	 * Returns:
	 *  A JSon constructor string to generate a JS DataTable with the data
	 *  stored in the DataTable object.
	 *  Example result (the result is without the newlines):
	 *   {cols: [{id:'a',label:'a',type:'number'},
	 *           {id:'b',label:'b',type:'string'},
	 *           {id:'c',label:'c',type:'number'}],
	 *    rows: [{c:[{v:1},{v:'z'},{v:2}]}, c:{[{v:3,f:'3$'},{v:'w'},{v:null}]}],
	 *    p:     {'foo': 'bar'}}
	 * 
	 * Throws an exception if the data does not match the type.
	 */
	this.toJSON = function(columnOrder, orderBy) {
		if( arguments.length == 0 || columnOrder == null ) {
			columnOrder = [];
			for( var i in this._columns ) {	columnOrder.push(this._columns[i].id); }
		}
		var colDict = {};
		for( var i in this._columns ) { colDict[this._columns[i].id] = this._columns[i]; }

		// Creating the columns jsons
		var colJSON = [];
		for( var i in columnOrder ) {
			var d = DataTable._o.clone(colDict[columnOrder[i]]);
			d.id = DataTable._escapeValue(d.id);
			d.label = DataTable._escapeValue(d.label);
			d.cp = '';
			if( DataTable._o.prop(colDict[columnOrder[i]].custom_properties).length ) {
				var prop = colDict[columnOrder[i]].custom_properties
				d.cp = ',p:'+DataTable._escapeCustomProperties(prop);
			}
			colJSON.push("{id:"+d.id+",label:"+d.label+",type:'"+d.type+"'"+d.cp+"}");
		}

		// Creating the rows jsons
		var rowJSON = [];
		var prepData = this.preparedData(orderBy);
		for( var i in prepData ) {
			var row = prepData[i][0],
				cp = prepData[i][1];
			var cellJSON = [];
			for( var i in columnOrder ) {
				// We omit the {v:null} for a None value of the not last column
				var value = row[columnOrder[i]];
				if( !value && columnOrder[i] != columnOrder[columnOrder.length-1] ) {
					cellJSON.push('');
				} else {
					value = DataTable.singleValueToJS(value, colDict[columnOrder[i]]['type']);
					if( DataTable._t.isArray(value) ) {
						// We have a formatted value or custom property as well
						if( row[columnOrder[i]].length == 3 ) {
							if( value[1] == null ) {
								cellJSON.push('{v:'+value[0]+',p:'
									+DataTable._escapeCustomProperties(row[columnOrder[i]][2])+'}');
							} else {
								cellJSON.push('{v:'+value+',f:'
									+DataTable._escapeCustomProperties(row[columnOrder[i]][2])+',p:}');
							}
						} else {
							cellJSON.push('{v:'+value[0]+',f:'+value[1]+'}');
						}
					} else {
						cellJSON.push('{v:'+value+'}');
					}
				}
			}
			if( DataTable._o.prop(cp).length ) {
				rowJSON.push('{c:['+cellJSON.join(',')+'],p:'
					+DataTable._escapeCustomProperties(cp)+'}'); 
			} else {
				rowJSON.push('{c:['+cellJSON.join(',')+']}');
			}
		}
		
		var genCustomProperties = '';
		if( DataTable._o.prop(this.customProperties).length ) {
			genCustomProperties = ',p:'+DataTable._escapeCustomProperties(this.customProperties);
		}  
		
		var json = "{cols:["+colJSON.join(',')+"],rows:["+rowJSON.join(',')+"]"+genCustomProperties+"}";
		return json;
	};

	/**
	 * Writes the data table as a CSV string.
	 * 
	 * Args:
	 *   columnOrder: Optional. Specifies the order of columns in the
	 *                output table. Specify a list of all column IDs in the order
	 *                in which you want the table created.
	 *                Note that you must list all column IDs in this parameter,
	 *                if you use it.
	 *   orderBy: Optional. Specifies the name of the column(s) to sort by.
	 *            Passed as is to _PreparedData.
	 *   separator: Optional. The separator to use between the values.
	 * 
	 * Returns:
	 *   A CSV string representing the table.
	 *   Example result:
	 *    'a', 'b', 'c'
	 *    1, 'z', 2
	 *    3, 'w', ''
	 * 
	 * Throws an exception if the data does not match the type.
	 */
	this.toCSV = function(columnOrder, orderBy, separator) {
		if( arguments.length < 3 ) { separator = ', '; }
		if( arguments.length < 2 ) { orderBy = []; }
		if( arguments.length < 1 ) { columnOrder= null; }
		
		if( columnOrder == null ) {
			columnOrder = [];
			for( var i in this._columns ) {	columnOrder.push(this._columns[i].id); }
		}
		var colDict = {};
		for( var i in this._columns ) { colDict[this._columns[i].id] = this._columns[i]; }

		var columnList = [];
		for( var i in columnOrder ) {
			columnList.push(DataTable._escapeValueForCSV(colDict[columnOrder[i]].label));
		}
		var columnLine = columnList.join(separator);

		var rowList = [];
		// We now go over the data and add each row
		var prepData = this.preparedData(orderBy);
		for( var i in prepData ) {
			var row = prepData[i][0];
			var cellList = [];
			// We add all the elements of this row by their order
			for( var j in columnOrder ) {
				var col = columnOrder[j];
				var value = '""';
				if( row[col] != null ) {
					value = DataTable.singleValueToJS(row[col], colDict[col].type,
						DataTable._escapeValueForCSV);
				}
				if( DataTable._t.isArray(value) ) {
					// We have a formatted value. Using it only for date/time types.
					if( ['date', 'datetime', 'timeofday'].some(function(e){ return e == colDict[col].type; }) ) {
						cellList.push(value[1]);
					} else {
						cellList.push(value[0]);
					}
				} else {
					// We need to quote date types, because they contain commas.
					if( value != '""' &&
						['date', 'datetime', 'timeofday'].some(function(e){ return e == colDict[col].type; }) ) {
						value = '"'+value+'"';
					}
					cellList.push(value); 
				}
			}
			rowList.push(cellList.join(separator));
		}
		return columnLine+'\n'+rowList.join('\n');
	}

	/*
	 * Returns a file in tab-separated-format readable by MS Excel.
	 * 
	 * Returns a file in UTF-16 little endian encoding, with tabs separating the
	 * values.
	 * 
	 * Args:
	 *   columnOrder: Delegated to toCsv().
	 *   orderBy: Delegated to toCsv().
	 * 
	 * Returns:
	 *   A tab-separated little endian UTF16 file representing the table.
	 */
	this.toTSVExcel = function(columnOrder, orderBy) {
		if( arguments.length < 2 ) { orderBy = []; }
		if( arguments.length < 1 ) { columnOrder= null; }
		
		return this.toCSV(columnOrder, orderBy, "\t");
	}
	
	/**
	 * Writes the data table as an HTML table code string.
	 * 
	 * Args:
	 *   columnOrder: Optional. Specifies the order of columns in the
	 *                output table. Specify a list of all column IDs in the order
	 *                in which you want the table created.
	 *                Note that you must list all column IDs in this parameter,
	 *                if you use it.
	 *   orderBy: Optional. Specifies the name of the column(s) to sort by.
	 *            Passed as is to _preparedData().
	 * 
	 * Returns:
	 *  An HTML table code string.
	 *   Example result (the result is without the newlines):
	 *    <html><body><table border='1'>
	 *     <thead><tr><th>a</th><th>b</th><th>c</th></tr></thead>
	 *     <tbody>
	 *      <tr><td>1</td><td>"z"</td><td>2</td></tr>
	 *      <tr><td>"3$"</td><td>"w"</td><td></td></tr>
	 *     </tbody>
	 *   </table></body></html>
	 * 
	 * Throws an exception if the data does not match the type.
	 */
	this.toHTML = function(columnOrder, orderBy) {
		if( arguments.length < 2 ) { orderBy = []; }
		if( arguments.length < 1 ) { columnOrder= null; }

		var tableTemp = "<html><body><table border='1'>%s</table></body></html>";
		var colTemp = "<thead><tr>%s</tr></thead>";
		var bodyTemp = "<tbody>%s</tbody>";
		var rowTemp = "<tr>%s</tr>";
		var headerCellTemp = "<th>%s</th>";
		var cellTemp = "<td>%s</td>";

		if( columnOrder == null ) {
			columnOrder = [];
			for( var i in this._columns ) {	columnOrder.push(this._columns[i].id); }
		}
		var colDict = {};
		for( var i in this._columns ) { colDict[this._columns[i].id] = this._columns[i]; }
		
		var columnList = [];
		for( var i in columnOrder ) {
			col = columnOrder[i];
			columnList.push(headerCellTemp.replace(/%s/g,DataTable._escapeHTML(colDict[col].label)));
		}
		var headHTML = colTemp.replace(/%s/g,columnList.join(''));
		
		var rowList = [];
		// We now go over the data and add each row
		var prepData = this.preparedData(orderBy);
		for( var i in prepData ) {
			var row = prepData[i][0];
			var cellList = [];
			// We add all the elements of this row by their order
			for( var j in columnOrder ) {
				var col = columnOrder[j];
				// For empty string we want empty quotes ("").
				var value = "";
				if( row[col] != null ) {
					value = DataTable.singleValueToJS(row[col], colDict[col].type);
				}
				if( DataTable._t.isArray(value) ) {
					// We have a formatted value and we're going to use it
					cellList.push(cellTemp.replace(/%s/g,DataTable._escapeHTML(value[1])));
				} else {
					cellList.push(cellTemp.replace(/%s/g,DataTable._escapeHTML(value)));
				}
			}
			rowList.push(rowTemp.replace(/%s/g,cellList.join('')));
		}
		var bodyHTML = bodyTemp.replace(/%s/g,rowList.join(''));
		return tableTemp.replace(/%s/g,headHTML + bodyHTML);
	};
	
	/**
	 * Writes a table as a JSON response that can be returned as-is to a client.
	 * 
	 * This method writes a JSON response to return to a client in response to a
	 * Google Visualization API query. This string can be processed by the calling
	 * page, and is used to deliver a data table to a visualization hosted on
	 * a different page.
	 * 
	 * Args:
	 *   columnOrder: Optional. Passed straight to self.toJSON().
	 *   orderBy: Optional. Passed straight to self.toJSON().
	 *   reqId: Optional. The response id, as retrieved by the request.
	 *   responseHandler: Optional. The response handler, as retrieved by the
	 *       request.
	 * 
	 * Returns:
	 *   A JSON response string to be received by JS the visualization Query
	 *   object. This response would be translated into a DataTable on the
	 *   client side.
	 *   Example result (newlines added for readability):
	 *    google.visualization.Query.setResponse({
	 *       'version':'0.6', 'reqId':'0', 'status':'OK',
	 *       'table': {cols: [...], rows: [...]}});
	 * 
	 * Note: The URL returning this string can be used as a data source by Google
	 *       Visualization Gadgets or from JS code.
	 */
	this.toJSONResponse = function(columnOrder,orderBy,reqId,responseHandler) {
		if( arguments.length < 4 ) { responseHandler = 'google.visualization.Query.setResponse'; }
		if( arguments.length < 3 ) { reqId = 0; }
		if( arguments.length < 2 || orderBy == null ) { orderBy = []; }		
		if( arguments.length < 1 ) { columnOrder = null; }

		var table = this.toJSON(columnOrder, orderBy);
		return "%s({'version':'0.6', 'reqId':'%s', 'status':'OK', 'table': %s});"
			.replace('%s',responseHandler).replace('%s',reqId).replace('%s',table);
	}
	
	/**
	 * Writes the right response according to the request string passed in tqx.
	 * 
	 * This method parses the tqx request string (format of which is defined in
	 * the documentation for implementing a data source of Google Visualization),
	 * and returns the right response according to the request.
	 * It parses out the "out" parameter of tqx, calls the relevant response
	 * (toJSONResponse() for "json", toCSV() for "csv", toHTML() for "html",
	 * toTSVExcel() for "tsv-excel") and passes the response function the rest of
	 * the relevant request keys.
	 * 
	 * Args:
	 *  columnOrder: Optional. Passed as is to the relevant response function.
	 *  orderBy: Optional. Passed as is to the relevant response function.
	 *  tqx: Optional. The request string as received by HTTP GET. Should be in
	 *       the format "key1:value1;key2:value2...". All keys have a default
	 *       value, so an empty string will just do the default (which is calling
	 *       ToJSonResponse() with no extra parameters).
	 * 
	 * Returns:
	 *   A response string, as returned by the relevant response function.
	 * 
	 * Throws an exception if one of the parameters passed in tqx is not supported.
	 */
	this.toResponse = function(columnOrder,orderBy,tqx) {
		if( arguments.length < 3 ) { tqx = ''; }
		if( arguments.length < 2 || orderBy == null ) { orderBy = []; }
		if( arguments.length < 1 ) { columnOrder = null; }
		
		var tqxDict = {
			version: '0.6',
			out: 'json',
			responseHandler: 'google.visualization.Query.setResponse',
			reqId: 0
		}
		
		if( tqx ) {
			var options = tqx.split(';');
			if( !options || !options.length ) { throw 'Invalid tqx provided.'; }
			for( i in options ) {
				var opt = options[i].split(':');
				if( opt.length != 2 ) { throw 'Invalid tqx provided.'; }
				tqxDict[opt[0]] = opt[1];
			}
		}
		if( tqxDict.version != '0.6' ) { 
			throw 'Version (%s) passed by request is not supported.'.replace('%s',tqxDict['version']);
		}
		
		if( tqxDict.out == 'json' ) {
			return this.toJSONResponse(columnOrder, orderBy,
				tqxDict.reqId, tqxDict.responseHandler)
		}
		if( tqxDict.out == 'html' ) {
			return this.toHTML(columnOrder,orderBy);
		}
		if( tqxDict.out == 'csv' ) {
			return this.toCSV(columnOrder,orderBy);
		}
		if( tqxDict.out == 'tsv-excel' ) {
			return this.toTSVExcel(columnOrder,orderBy);
		}
		throw "'out' parameter: '%s' is not supported".replace('%s',tqxDict.out);
	};

	/*
	 * Initialization
	 */	
	
	this._columns = DataTable.tableDescriptionParser(tableDescription);
	this._data = [];
	this.customProperties = {};

	if( arguments.length > 2 && customProperties != null ) {
		this.customProperties = customProperties;
	}
	if( arguments.length > 1 && data != null ) {
		this.loadData(data);
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
 *   - [value, formatted value]
 *   - [value, formatted value, custom properties]
 *  where the formatted value is a string, and custom properties is a
 *  dictionary of the custom properties for this cell.
 *  To specify custom properties without specifying formatted value, one can
 *  pass null as the formatted value.
 *  One can also have a null-valued cell with formatted value and/or custom
 *  properties by specifying null for the value.
 *  This method ignores the custom properties except for checking that it is a
 *  dictionary. The custom properties are handled in the toJSON() and toJSCode()
 *  methods.
 *  The real type of the given value is not strictly checked. For example,
 *  any type can be used for string - as we simply convert it with String() and for
 *  boolean value we just check "if( value )".
 *  Examples:
 *    singleValueToJS(null, "boolean") returns "null"
 *    singleValueToJS(false, "boolean") returns "false"
 *    singleValueToJS([5, "5$"], "number") returns ["5", "'5$'"]
 *    singleValueToJS([null, "5$"], "number") returns ["null", "'5$'"]
 *
 * Throws an exception if the value and type did not match in a non-recoverable
 * way, for example given value 'abc' for type 'number'.
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
 *    ['id', 'type']
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
 * Throws an exception if the column description did not match the RE, or
 * an unsupported type was passed.
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
 * by the DataTable object. Returns a flat array of parsed columns.
 *
 * Args:
 *   tableDescription: A description of the table which should comply
 *                     with one of the formats described below.
 *   depth: Optional. The depth of the first level in the current description.
 *          Used by recursive calls to this function.
 *
 * Returns:
 *   List of columns, where each column is represented by an object with the
 *   properties: id, label, type, depth, container which means the following:
 *   - id: the id of the column
 *   - name: The name of the column
 *   - type: The datatype of the elements in this column. Allowed types are
 *           described in ColumnTypeParser().
 *   - depth: The depth of this column in the table description
 *   - container: 'dict', 'iter' or 'scalar' for parsing the format easily.
 *   - custom_properties: The custom properties for this column.
 *   The returned description is flattened regardless of how it was given.
 *
 * Throws an exception if there is an error in a column description or in the 
 * description structure.
 *
 * Examples:
 *   A column description can be of the following forms:
 *    'id'
 *    ['id',]
 *    ['id', 'type']
 *    ['id', 'type', 'label']
 *    ['id', 'type', 'label', {'custom_prop1': 'custom_val1'}]
 *    or as an object:
 *    {'id': 'type'}
 *    {'id': ['type',]}
 *    {'id': ['type', 'label']}
 *    {'id': ['type', 'label', {'custom_prop1': 'custom_val1'}]}
 *   If the type is not specified, we treat it as string.
 *   If no specific label is given, the label is simply the id.
 *   If no custom properties are given, we use an empty dictionary.
 *
 *   input: [['a', 'date'], ['b', 'timeofday', 'b', {'foo': 'bar'}]]
 *   output: [{'id': 'a', 'label': 'a', 'type': 'date',
 *             'depth': 0, 'container': 'iter', 'custom_properties': {}},
 *            {'id': 'b', 'label': 'b', 'type': 'timeofday',
 *             'depth': 0, 'container': 'iter',
 *             'custom_properties': {'foo': 'bar'}}]
 *
 *   input: {'a': [['b', 'number'], ['c', 'string', 'column c']]}
 *   output: [{'id': 'a', 'label': 'a', 'type': 'string',
 *             'depth': 0, 'container': 'dict', 'custom_properties': {}},
 *            {'id': 'b', 'label': 'b', 'type': 'number',
 *             'depth': 1, 'container': 'iter', 'custom_properties': {}},
 *            {'id': 'c', 'label': 'column c', 'type': 'string',
 *             'depth': 1, 'container': 'iter', 'custom_properties': {}}]
 *
 *   input: {'a': ['number', 'column a'), 'b': ['string', 'column b']}
 *   output: [{'id': 'a', 'label': 'column a', 'type': 'number', 'depth': 0,
 *            'container': 'dict', 'custom_properties': {}},
 *            {'id': 'b', 'label': 'column b', 'type': 'string', 'depth': 0,
 *            'container': 'dict', 'custom_properties': {}}
 *
 *   NOTE: there might be ambiguity in the case of a dictionary representation
 *   of a single column. For example, the following description can be parsed
 *   in 2 different ways: {'a': ['b', 'c']} can be thought of a single column
 *   with the id 'a', of type 'b' and the label 'c', or as 2 columns: one named
 *   'a', and the other named 'b' of type 'c'. We choose the first option by
 *   default.
 */
DataTable.tableDescriptionParser = function(tableDescription, depth) {
	if( arguments.length < 2 ) { depth = 0; }
	var _t = DataTable._t;
	var _o = DataTable._o;

	// For the recursion step, we check for a column definition
	if( DataTable._isColumnDesc(tableDescription) ) {
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
			// We parse the column type as [key, type] or [key, type, label]
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

	// This is an outer object, must have at most one key.
	var parsedCol = DataTable.columnTypeParser(_o.prop(tableDescription)[0]);
	parsedCol.depth = depth;
	parsedCol.container = 'dict';

	var result = DataTable.tableDescriptionParser(_o.val(tableDescription)[0],depth + 1)
	result.unshift(parsedCol);
	return result;
};

// Puts the string in quotes, and escapes any inner quotes and slashes.
/*
 There are characters that are handled inconsistently in browsers, and so must be escaped when placed in strings.

\u0000-\u001f
\u007f-\u009f
\u00ad
\u0600-\u0604
\u070f
\u17b4
\u17b5
\u200c-\u200f
\u2028-\u202f
\u2060-\u206f
\ufeff
\ufff0-\uffff
*/
DataTable._escapeValue = function(v) {
	// FIXME this surely isn't strictly correct. It passes the tests
	var result = String(v)
	var q = result.indexOf("'") > -1 ? '"' : "'";

	result = escape(result)
		.replace(/%3C/g,'<').replace(/%3E/g,'>')
		.replace(/%24/g,'$').replace(/%27/g,"'");

	return q+result+q;
};

// Escapes the custom properties object.
DataTable._escapeCustomProperties = function(properties) {
	l = [];
	for( var key in properties ) {
		l.push(DataTable._escapeValue(key)+':'+DataTable._escapeValue(properties[key]));
	}
	return '{'+l.join(',')+'}';
};

/*
 * Escapes the value for use in a CSV file.
 * 
 *  Puts the string in double-quotes, and escapes any inner double-quotes by
 *  doubling them.
 * 
 *  Args:
 *    v: The value to escape.
 * 
 *  Returns:
 *    The escaped values.
 */
DataTable._escapeValueForCSV = function(value) {
	return '"'+value.replace('"', '""')+'"'
}

// convert appropriate characters to html entities
DataTable._escapeHTML = function(value) {
	return value.replace(/&/g,'&amp;')
		.replace(/>/g,'&gt;')
		.replace(/</g,'&lt;')
		.replace(/"/g,'&quot;');
}

// a fallable heuristic to determine if a value is a column definition
DataTable._isColumnDesc = function(value) {
	if( DataTable._t.isString(value) ) { return true; }
	if( DataTable._t.isArray(value) ) {
		if( value.length == 1 ) { return false; }
		if( !DataTable._t.isString(value[1]) ) { return false; }
		if( [
			'string','number','boolean','date','timeofday','datetime'
		].some(function(e){ return e == value[1]}) ) { return true; }
	}
	return false;
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
	},
	clone: function(obj) {
		if( !DataTable._t.isObject(obj) ) return {};
		var newObj = (obj instanceof Array) ? [] : {};
		for (i in obj) {
			if (obj[i] && typeof obj[i] == "object") {
				newObj[i] = this.clone(obj[i]);
			} else {
				newObj[i] = obj[i]
			}
		} 
		return newObj;
	}
};

exports.DataTable = DataTable;

