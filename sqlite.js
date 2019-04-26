const SQL = require('sqlite3').verbose();
const {forEach, isArray, isObject, isNull, isUndefined} = require("lodash");
const {vsprintf, sprintf} = require("sprintf-js");
const path = require("path");

// Default path
let sqlpath = path.resolve(process.cwd(), 'database.sqlite');

class SQLite {

    /**
     * Create SQLite instance
     * @param table
     */
    constructor(table) {
        this.columns = [];
        this.sort = [];
        this.joins = [];
        this.limit = null;
        this.setTable(table);
        this.connection = new SQL.Database(sqlpath)
    }

    /**
     * Set sqlite database
     * @param path
     */
    static setDatabase(path) {
        sqlpath = path;
    }

    /**
     * Get join type
     * @param key
     * @return {string}
     * @private
     */
    _getJoinType(key) {
        switch (key.toLowerCase()) {
            default:
            case "left":
                return "LEFT JOIN";
                break;
            case "inner":
                return "INNER JOIN";
                break;
            case "right":
                return "RIGHT JOIN";
                break;
        }
    }

    /**
     * Insert placeholder string
     * @param length
     * @return {string}
     * @private
     */
    _placeHoldersString(length) {
        let places = '';
        for (let i = 1; i <= length; i++) {
            places += '?, '
        }
        return /(.*),/.exec(places)[1]
    }

    /**
     * Set current table
     * @param table
     */
    setTable(table) {
        this.table = table;
    }

    /**
     * Get current table
     * @return {*}
     */
    getTable() {
        return this.table;
    }

    /**
     * Set query columns
     * @param arr
     */
    setColumns(...arr) {
        if (isArray(arr[0]))
            arr = arr[0];
        this.columns = arr;
    }

    /**
     * Set query limit
     * @param limit
     */
    setLimit(limit) {
        this.limit = limit;
    }

    /**
     * Set query sort
     * @param sort
     */
    setSort(sort) {
        this.sort.push(sort);
    }

    /**
     * Add join query
     * @param type
     * @param table
     * @param tableAndColA
     * @param tableAndColB
     */
    join(type, table, tableAndColA, tableAndColB) {
        this.joins.push(sprintf("%s %s ON %s = %s", this._getJoinType(type), table, tableAndColA, tableAndColB));
    }

    /**
     * Run query
     * @param query
     * @param args
     * @return {Promise<any>}
     */
    query(query, ...args) {
        return new Promise(function (resolve, reject) {

            if (/^select/i.test(query)) {
                this.connection.all(query, args, function (err, rows) {
                    if (!err)
                        resolve(rows);
                    else
                        reject(err);
                });
            } else {
                let stmt = this.connection.prepare(query);
                stmt.run(...args);
                stmt.finalize(function (err) {
                    if (!err)
                        resolve(err);
                    else
                        reject(err);
                });
            }
        }.bind(this));
    }

    /**
     * Run select query
     * @param whereStatement
     * @param args
     * @return {Promise<any>}
     */
    select(whereStatement, ...args) {
        return new Promise(function (resolve, reject) {
            if (whereStatement) {
                whereStatement = whereStatement.replace(/where/i, "");
            }

            let query = [];
            query.push(this.columns.length > 0 ? this.columns.join(", ") : "*");
            query.push(this.getTable());
            query.push(this.joins.length > 0 ? this.joins.join(" ") : "");
            query.push(whereStatement ? "WHERE " + whereStatement : "");
            query.push(this.sort.length > 0 ? " ORDER BY " + this.sort.join(",") : "");
            query.push(this.limit ? "LIMIT " + this.limit : "");

            this.query(vsprintf("SELECT %s FROM %s %s %s %s %s", query), args).then(function (rows) {
                delete rows.meta;
                forEach(rows, function (item, index) {
                    let newItem = {};
                    forEach(Object.keys(item), function (key) {
                        try {
                            if (!isNull(newItem[key]))
                                newItem[key] = JSON.parse(item[key]);
                            else
                                newItem[key] = item[key];
                        } catch (e) {
                            newItem[key] = item[key];
                        }
                    }.bind(this));
                    rows[index] = newItem;
                }.bind(this));
                resolve(rows);
            }.bind(this)).catch(function (e) {
                reject(e);
            });
        }.bind(this));
    }

    /**
     * Run insert query
     * @param data
     * @return {Promise<any>}
     */
    insert(data) {
        let columns = [];
        let values = [];

        forEach(Object.keys(data), function (key) {
            let item = data[key];
            if (isArray(item) || isObject(item))
                item = JSON.stringify(item);
            if (isUndefined(item))
                item = null;

            columns.push(key);
            values.push(item);
        }.bind(this));

        return this.query(vsprintf(`INSERT INTO %s (%s) VALUES(${this._placeHoldersString(values.length)})`, [
            this.getTable(),
            columns.join(", ")
        ]), values);
    }

    /**
     * Run update query
     * @param data
     * @param whereStatement
     * @param args
     * @return {Promise<any>}
     */
    update(data, whereStatement, ...args) {
        if (whereStatement) {
            whereStatement = whereStatement.replace(/where/i, "");
        }

        let columns = [];
        let values = [];
        forEach(Object.keys(data), function (key) {
            let item = data[key];
            if (isArray(item) || isObject(item))
                item = JSON.stringify(item);

            values.push(item);
            columns.push(sprintf("%s = ?", key));
        }.bind(this));

        let opts = values.concat(args);

        let query = [];
        query.push(this.getTable());
        query.push((columns ? columns.join(", ") : ""));
        query.push((whereStatement ? "WHERE " + whereStatement : ""));
        return this.query(vsprintf("UPDATE %s SET %s %s", query), opts);
    }

    /**
     * Run delete query
     * @param whereStatement
     * @param args
     * @return {Promise<any>}
     */
    delete(whereStatement, ...args) {
        if (whereStatement) {
            whereStatement = whereStatement.replace(/where/i, "");
        }

        let query = [];
        query.push(this.getTable());
        query.push(whereStatement ? "WHERE " + whereStatement : "");
        return this.query(vsprintf("DELETE FROM %s %s", query), args);
    }

    /**
     * Close sqlite connection
     */
    close() {
        this.connection.close();
    }
}

/**
 * @type {SQLite}
 */
module.exports = SQLite;