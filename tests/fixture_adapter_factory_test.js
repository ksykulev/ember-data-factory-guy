var testHelper, store;

module('FactoryGuy with DS.FixtureAdapter', {
  setup: function () {
    testHelper = TestHelper.setup(DS.FixtureAdapter);
    store = testHelper.getStore();
  },
  teardown: function () {
    Em.run(function () {
      testHelper.teardown();
    });
  }
});


test("#pushFixture adds fixture to Fixture array on model", function () {
  var fixtureJson = FactoryGuy.build('user');
  FactoryGuy.pushFixture(User, fixtureJson);
  equal(User.FIXTURES.length, 1);

  var fixtureJson2 = FactoryGuy.build('user');
  FactoryGuy.pushFixture(User, fixtureJson2);
  equal(User.FIXTURES.length, 2);
});


asyncTest("can change fixture attributes after creation", function () {
  var user = store.makeFixture('user');
  notEqual(user.name, 'new name');
  user.name = "new name";

  store.find('user', 1).then(function (user) {
    equal(user.get('name'), "new name", "changes local attributes");
    start();
  });
});


test("#resetModels clears the store of models, clears the FIXTURES arrays for each model and resets the model definition", function () {
  var project = store.makeFixture('project');
  var user = store.makeFixture('user', { projects: [project] });

  for (model in FactoryGuy.modelDefinitions) {
    var definition = FactoryGuy.modelDefinitions[model];
    sinon.spy(definition, 'reset');
  }

  equal(User.FIXTURES.length, 1);
  equal(Project.FIXTURES.length, 1);

  equal(store.all('user').get('length'), 1);
  equal(store.all('project').get('length'), 1);

  FactoryGuy.resetModels(store);

  equal(User.FIXTURES.length, 0);
  equal(Project.FIXTURES.length, 0);

  equal(store.all('user').get('length'), 0);
  equal(store.all('project').get('length'), 0);

  for (model in FactoryGuy.modelDefinitions) {
    var definition = FactoryGuy.modelDefinitions[model];
    ok(definition.reset.calledOnce);
    definition.reset.restore();
  }
});

test("Confirm traits work with DS.FixtureAdapter", function () {
  var project = store.makeFixture('project', 'big'),
      projectWithUser = store.makeFixture('project_with_admin');

  equal(project.title, 'Big Project', 'Big trait changed name to "Big Project"');
  ok(false);
  projectWithUser.get('user');
});

module('DS.Store with DS.FixtureAdapter', {
  setup: function () {
    testHelper = TestHelper.setup(DS.FixtureAdapter);
    store = testHelper.getStore();
  },
  teardown: function () {
    Em.run(function () {
      testHelper.teardown();
    });
  }
});


test("#makeFixture builds and pushes fixture into the models FIXTURE array", function () {
  var json = store.makeFixture('user');
  equal(User.FIXTURES.length, 1);
  equal(User.FIXTURES[0], json);
});

asyncTest("#makeFixture sets belongsTo on hasMany associations", function () {
  var p1 = store.makeFixture('project');
  // second project not added on purpose to make sure only one is
  // assigned in hasMany
  store.makeFixture('project');
  var user = store.makeFixture('user', {projects: [p1]})

  store.find('user', 1).then(function (user) {
    var projects = user.get('projects');
    console.log(user+'', user.toJSON())
    console.log(user+'', projects)
    equal(projects.get('length'), 1, "adds hasMany records");
    start();
  });
});

asyncTest("#makeFixture adds record to hasMany association array for which it belongsTo", function () {
  var userJson = store.makeFixture('user');
  var projectJson = store.makeFixture('project', { user: userJson });

  store.find('user', userJson.id).then(function (user) {
    var projects = user.get('projects');
    equal(projects.get('length'), 1, "adds hasMany records");
    equal(projects.get('firstObject.user'), user, "sets belongsTo record");
    start();
  });
});

asyncTest("#makeFixture handles trait belongsTo associations in fixture", function () {
  var projectWithUser = store.makeFixture('project_with_user');
  equal(User.FIXTURES.length, 1);

  store.find('user', 1).then(function (user) {
    var projects = user.get('projects');
    equal(projects.get('length'), 1, "adds hasMany records");
    equal(projects.get('firstObject.user.id'), 1, "sets belongsTo record");
    start();
  });
});

asyncTest("#makeFixture handles belongsTo association in fixture", function () {
  debugger;
  var projectWithUser = store.makeFixture('project_with_user');
  equal(User.FIXTURES.length, 1);
  debugger;

  store.find('project', projectWithUser.id).then( function(project) {
    console.log('a',project+'', project.id)
    console.log('b',project.get('user')+'');
    console.log('c',project.get('user').toJSON());
    project.get('user').then(function(user) {
      console.log('c',user.toJSON());
      start();
    });
 });
});

asyncTest('#makeFixture handles hasMany association in fixture', function () {

});

asyncTest("#createRecord adds belongsTo association to records it hasMany of", function () {
  var user = store.makeFixture('user');

  store.find('user', user.id).then(function (user) {
    var projectJson = {title: 'project', user: user};

    store.createRecord('project', projectJson).save()
      .then(function (project) {
        return Ember.RSVP.all([project.get('user'), user.get('projects')]);
      }).then(function (promises) {
        var projectUser = promises[0], projects = promises[1];

        equal(projectUser, user);
        equal(projects.get('length'), 1);
        start();
      });
  });
});

asyncTest("#createRecord can work for one-to-none associations", function () {
  var user = store.makeFixture('user');

  store.find('user', user.id).then(function (user) {
    var smallCompanyJson = {name: 'small company', owner: user};

    store.createRecord('small_company', smallCompanyJson).save()
      .then(function (smallCompany) {
        return smallCompany.get('owner');
      }).then(function (owner) {
        equal(owner.get('id'), user.get('id'));
        start();
      });
  });
});

asyncTest("#createRecord adds hasMany association to records it hasMany of ", function () {
  var usersJson = store.makeList('user', 3);
  var userPromises = usersJson.map(function(json) { return store.find('user', json.id) });

  Ember.RSVP.all(userPromises).then(function (users) {
    var propertyJson = {name: 'beach front property'},
        property = store.createRecord('property', propertyJson),
        owners = property.get('owners');

    owners.addObjects(users);
    equal(users.get('length'), usersJson.length);
    start();
  });
});
