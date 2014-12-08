/**
 * Test dependencies.
 */

var start = require('./common');
var mongoose = start.mongoose;
var assert = require('assert');

describe('Mongoose Bulk API wrapper', function() {
  var db;

  beforeEach(function() {
    db = start();
  });

  afterEach(function(done) {
    db.close(done);
  });

  it('unordered inserts work', function(done) {
    var omeletteSchema = mongoose.Schema({ topping: String });

    var Omelette = db.model('gh-2399-1', omeletteSchema);

    Omelette.
      initializeUnorderedBulkOp().
      insert({ topping: 'bacon' }).
      insert({ topping: 'sausage' }).
      execute(function(error) {
        assert.ifError(error);
        Omelette.find({}).sort({ topping: 1 }).exec(function(error, toppings) {
          assert.ifError(error);
          assert.equal(2, toppings.length);
          assert.equal('bacon', toppings[0].topping);
          assert.equal('sausage', toppings[1].topping);
          done();
        });
      });
  });
});
