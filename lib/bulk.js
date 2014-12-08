/*!
 * Module dependencies.
 */

var mongodb = require('mongodb');
var Document = require('./document');
var Promise = require('mpromise');
var utils = require('./utils');

function Bulk(model, isOrdered) {
  this._ = {
    model: model,
    isOrdered: isOrdered,
    validatePromises: []
  };

  this.initialize();
}

Bulk.prototype.initialize = function() {
  if (this._.isOrdered) {
    this._.driverBulkOp = this._.model.collection.initializeOrderedBulkOp();
  } else {
    this._.driverBulkOp = this._.model.collection.initializeUnorderedBulkOp();
  }
};

Bulk.prototype.insert = function(doc) {
  var _this = this;

  if (!(doc instanceof Document)) {
    doc = new this._.model(doc);
  }

  var promise = doc.validate();
  var promiseIndex = this._.validatePromises.length;
  this._.validatePromises.push(promise);
  promise.
    then(function() {
      var schemaOptions = utils.clone(_this._.model.schema.options);
      schemaOptions.toObject = schemaOptions.toObject || {};

      var toObjectOptions = {};

      if (schemaOptions.toObject.retainKeyOrder) {
        toObjectOptions.retainKeyOrder = schemaOptions.toObject.retainKeyOrder;
      }
      toObjectOptions.depopulate = 1;
      toObjectOptions._skipDepopulateTopLevel = true;

      if (_this._.isOrdered) {
        if (promiseIndex === 0) {
          _this._.driverBulkOp.insert(doc.toObject(toObjectOptions));
        } else {
          _this._.validatePromises[promiseIndex - 1].then(function() {
            _this._.driverBulkOp.insert(doc.toObject(toObjectOptions));
          });
        }
      } else {
        _this._.driverBulkOp.insert(doc.toObject(toObjectOptions));
      }
    });

  return this;
};

Bulk.prototype.execute = function(writeConcern, callback) {
  var _this = this;
  var count = 0;
  if (this._.validatePromises.length === 0) {
    _this._.driverBulkOp.execute(writeConcern, callback);
  } else {
    for (var i = 0; i < this._.validatePromises.length; ++i) {
      this._.validatePromises[i].then(function() {
        if (++count === _this._.validatePromises.length) {
          _this._.model.collection.waitForCollection(function() {
            _this._.driverBulkOp.execute(writeConcern, callback);
          });
        }
      });
    }
  }
};

module.exports = Bulk;
