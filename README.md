gvisdata is a module for producing data for use with the Google Visulaization Data API. This module is a port of the Python library of the same purpose, provided by Google. http://code.google.com/p/google-visualization-python/

# Using the library

Place the gvisdata.js file in your project, and include something like the following in your code:

	var DataTable = require('./gvisdata').DataTable;
	
	var myTable = new DataTable(['col1','col2','col3']);
	myTable.loadData([['a','b','c'],['one','two','three']]);
	myTable.toJSONResponse();
	
This port was done for use in the Node.js environment. It has only been tested there. But, there is no dependency on Node.js. It should also be usable in other Javascript environments.

# Differences from gv-python

An attempt was made to preserve the API provided by the Python version of this library. Though, some changes were necessary:

* The use of tuples for column definitions is replaced by array's.
* The use of dictionaries for table definitions is replaced by Javascript objects.
* Consequently, hierarchial data can't be represended by objects with non-string properties, in the way that Python dicts can have tuple keys.
	  
Detailed documentation can be found in gvisdata.js.

# Testing the library

The gv-python tests have also been ported using QUnit. A modified version of QUnit is included. The tests (but not the library) are dependent on the Node.js environment. This dependency can be removed by modifying the 'output  configuration' block at the beginning of the tests file. By default it is configured to use the sys module provided by Node.js to display test results. To run the tests using Node:
	 	
	node gvisdata.tests.js
	

