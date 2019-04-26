# SQLite
This is a small and simple wrapper for sqlite in node / electron

## TODO
* Write a better README

## Installation
Install with npm:
```
npm install --save @wuild/sqlite
```

### Examples

#### Setup
```javascript
const DB = require("@wuild/sqlite");

// database file
DB.setDatabase("path/to/database.sqlite");

// in memory
DB.setDatabase(":memory:");
```

#### Full
```javascript
// Set table
let db = new DB("table_name");

// Insert data
db.insert({
    column: "data",
    column2: "other data"
}).then(function () {
    // Select data
    return db.select("column = ?", "data");
}).then(function () {
    // Update row
    return db.update({
        column: "change data"
    }, "column = ?", "data");
}).then(function(){
    // Delete row
    return db.delete("column = ?", "change data");
}).then(function(){
    // Run custom query
    return db.query("SELECT COUNT(column) as rows FROM table_name WHERE column = ?", "data")
}).then(function () {
    // Close connection
    return db.close()
}).catch(function (err) {
    db.close();
});
```

#### Joins
```javascript
let db = new DB("table1 as t1");
db.setLimit(1);
db.join("left", "table2 as t2", "t1.id", "t2.id");
db.select().then(function(rows){
    console.log(db.limit);
    db.close();
    console.log(rows);
});
```

#### License
Copyright © 2018, [Wuild](https://github.com/Wuild) Released under the [MIT license](https://opensource.org/licenses/MIT).