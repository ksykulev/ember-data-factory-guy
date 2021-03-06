/**
 A ModelDefinition encapsulates a model's definition

 @param model
 @param config
 @constructor
 */
var ModelDefinition = function (model, config) {
  var sequences = {};
  var traits = {};
  var defaultAttributes = {};
  var namedModels = {};
  var modelId = 1;
  var sequenceName = null;
  this.model = model;
  /**
   @param {String} name model name like 'user' or named type like 'admin'
   @returns {Boolean} true if name is this definitions model or this definition
   contains a named model with that name
   */
  this.matchesName = function (name) {
    return model == name || namedModels[name];
  };
  // Increment id
  this.nextId = function () {
    return modelId++;
  };
  /**
   Call the next method on the named sequence function. If the name
   is a function, create the sequence with that function

   @param   {String} name previously declared sequence name or
            an the random name generate for inline functions
   @param   {Function} sequenceFn optional function to use as sequence
   @returns {String} output of sequence function
   */
  this.generate = function (name, sequenceFn) {
    if (sequenceFn) {
      if (!sequences[name]) {
        // create and add that sequence function on the fly
        sequences[name] = new Sequence(sequenceFn);
      }
    }
    var sequence = sequences[name];
    if (!sequence) {
      throw new MissingSequenceError('Can not find that sequence named [' + sequenceName + '] in \'' + model + '\' definition');
    }
    return sequence.next();
  };
  /**
   Build a fixture by name

   @param {String} name fixture name
   @param {Object} opts attributes to override
   @param {String} traitArgs array of traits
   @returns {Object} json
   */
  this.build = function (name, opts, traitArgs) {
    var traitsObj = {};
    traitArgs.forEach(function (trait) {
      $.extend(traitsObj, traits[trait]);
    });
    var modelAttributes = namedModels[name] || {};
    // merge default, modelAttributes, traits and opts to get the rough fixture
    var fixture = $.extend({}, defaultAttributes, modelAttributes, traitsObj, opts);
    // deal with attributes that are functions or objects
    for (var attribute in fixture) {
      if (Ember.typeOf(fixture[attribute]) == 'function') {
        // function might be a sequence of a named association
        fixture[attribute] = fixture[attribute].call(this, fixture);
      } else if (Ember.typeOf(fixture[attribute]) == 'object') {
        // If it's an object and it's a model association attribute, build the json
        // for the association and replace the attribute with that json
        if (FactoryGuy.getStore()) {
          if (FactoryGuy.isAttributeRelationship(this.model, attribute)) {
            fixture[attribute] = FactoryGuy.build(attribute, fixture[attribute]);
          }
        } else {
          // For legacy reasons, if the store is not set in FactoryGuy, keep
          // this code the way it is ( though it will cause failures when the object is actually
          // a custom attribute and not a relationship ), while users start setting the store
          // in FactoryGuy, or using testHelper.make instead of store.makeFixture
          fixture[attribute] = FactoryGuy.build(attribute, fixture[attribute]);
        }
      }
    }
    // set the id, unless it was already set in opts
    if (!fixture.id) {
      fixture.id = this.nextId();
    }
    return fixture;
  };
  /**
   Build a list of fixtures

   @param {String} name model name or named model type
   @param {Integer} number of fixtures to build
   @param {Array} array of traits to build with
   @param {Object} opts attribute options
   @returns array of fixtures
   */
  this.buildList = function (name, number, traits, opts) {
    var arr = [];
    for (var i = 0; i < number; i++) {
      arr.push(this.build(name, opts, traits));
    }
    return arr;
  };
  // Set the modelId back to 1, and reset the sequences
  this.reset = function () {
    modelId = 1;
    for (var name in sequences) {
      sequences[name].reset();
    }
  };
  var parseDefault = function (object) {
    if (!object) {
      return;
    }
    defaultAttributes = object;
  };
  var parseTraits = function (object) {
    if (!object) {
      return;
    }
    traits = object;
  };
  var parseSequences = function (object) {
    if (!object) {
      return;
    }
    for (sequenceName in object) {
      var sequenceFn = object[sequenceName];
      if (Ember.typeOf(sequenceFn) != 'function') {
        throw new Error('Problem with [' + sequenceName + '] sequence definition. Sequences must be functions');
      }
      object[sequenceName] = new Sequence(sequenceFn);
    }
    sequences = object;
  };
  var parseConfig = function (config) {
    parseSequences(config.sequences);
    delete config.sequences;
    parseTraits(config.traits);
    delete config.traits;
    parseDefault(config.default);
    delete config.default;
    namedModels = config;
  };
  // initialize
  parseConfig(config);
};

if (FactoryGuy !== undefined) {
  FactoryGuy.modelDefiniton = ModelDefinition;
};
