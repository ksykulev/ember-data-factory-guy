var testHelper, store;

module('FactoryGuy with DS.FixtureAdapter', {
  setup: function () {
    testHelper = TestHelper.setup(DS.FixtureAdapter.extend());
    store = testHelper.getStore();
  },
  teardown: function () {
    Em.run(function () {
      testHelper.teardown();
      store.destroy();
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
  debugger;
  var user = FactoryGuy.make('user');
  notEqual(user.name, 'new name');
  user.name = "new name";

  store.find('user', 1).then(function (user) {
    equal(user.get('name'), "new name", "changes local attributes");
    start();
  });
});


test("#resetModels clears the store of models, clears the FIXTURES arrays for each model and resets the model definition", function () {
  var project = FactoryGuy.make('project');
  var user = FactoryGuy.make('user', { projects: [project] });

  for (model in FactoryGuy.modelDefinitions) {
    var definition = FactoryGuy.modelDefinitions[model];
    sinon.spy(definition, 'reset');
  }

  equal(User.FIXTURES.length, 1);
  equal(Project.FIXTURES.length, 1);

  equal(store.all('user').get('length'), 1);
  equal(store.all('project').get('length'), 1);

  Em.run(function() {
    FactoryGuy.resetModels(store);
  });

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

test("Confirm traits build relationships", function () {
  var project = FactoryGuy.make('project', 'big'),
      projectWithUser = FactoryGuy.make('project_with_admin');

  equal(Project.FIXTURES.length, 2);
  equal(User.FIXTURES.length, 1);

  equal(project.title, 'Big Project', 'Big trait changed name to "Big Project"');
  equal(projectWithUser.user, 1, 'User created');
});

module('DS.Store with DS.FixtureAdapter', {
  setup: function () {
    testHelper = TestHelper.setup(DS.FixtureAdapter.extend());
    store = testHelper.getStore();
  },
  teardown: function () {
    Em.run(function () {
      testHelper.teardown();
      store.destroy();
    });
  }
});


test("#make builds and pushes fixture into the models FIXTURE array", function () {
  var json = FactoryGuy.make('user');
  equal(User.FIXTURES.length, 1);
  equal(User.FIXTURES[0], json);
});

asyncTest("#make sets belongsTo on hasMany associations", function () {
  var p1 = FactoryGuy.make('project');
  // second project not added on purpose to make sure only one is
  // assigned in hasMany
  FactoryGuy.make('project');
  var user = FactoryGuy.make('user', {projects: [p1]})

  store.find('user', 1).then(function (user) {
    var projects = user.get('projects');
    equal(projects.get('length'), 1, "adds hasMany records");
    start();
  });
});

asyncTest("#make adds record to hasMany association array for which it belongsTo", function () {
  var userJson = FactoryGuy.make('user');
  var projectJson = FactoryGuy.make('project', { user: userJson });

  store.find('user', userJson.id).then(function (user) {
    var projects = user.get('projects');
    equal(projects.get('length'), 1, "adds hasMany records");
    ok(projects.get('firstObject.user') == user, "sets belongsTo record");
    start();
  });
});

asyncTest("#make handles traits declaring belongsTo associations in fixture", function () {
  var projectWithUser = FactoryGuy.make('project_with_user');
  equal(Project.FIXTURES.length, 1);
  equal(User.FIXTURES.length, 1);

  store.find('user', 1).then(function (user) {
    var projects = user.get('projects');

    equal(projects.get('length'), 1, "adds hasMany records");
    equal(projects.get('firstObject.id'), projectWithUser.id);
    equal(projects.get('firstObject.user.id'), 1, "sets belongsTo record");
    start();
  });
});

asyncTest("#make handles primary belongsTo association in fixture", function () {
  var projectWithUser = FactoryGuy.make('project_with_user');
  equal(Project.FIXTURES.length, 1);
  equal(User.FIXTURES.length, 1);

  store.find('project', projectWithUser.id).then( function(project) {
    var user = project.get('user');
    ok(user);
    equal(user.get('id'), projectWithUser.user);
    equal(user.get('projects.firstObject.id'), projectWithUser.id)

    start();
  });
});

asyncTest('#make handles hasMany association in fixture', function () {
  var userWithProjects = FactoryGuy.make('user', 'with_projects');
  equal(Project.FIXTURES.length, 2);
  equal(User.FIXTURES.length, 1);

  store.find('user', userWithProjects.id).then(function(user) {
    var projects = user.get('projects');
    equal(user.get('id'), userWithProjects.id);
    equal(projects.get('length'), 2);
    deepEqual(
      projects.mapBy('id').sort(),
      userWithProjects.projects.map(function(project){ return project.toString(); }).sort()
    );

    start();
  });
});

// TODO:: does not handle deeply embedded relationships yet..
// asyncTest('#make handles belongsTo deeply associated in fixture', function () {
//   var propertyOwnersProjects = FactoryGuy.make('property', 'with_owners_with_projects');
//   equal(Property.FIXTURES.length, 1);
//   equal(User.FIXTURES.length, 2);
//   equal(Project.FIXTURES.length, 4);
//
//   store.find('property', propertyOwnersProjects.id).then(function(property) {
//     var users = property.get('owners');
//     users.each(function(user){
//       user.get('projects');
//     });
//     start();
//   });
// });

asyncTest("#createRecord adds belongsTo association to records it hasMany of", function () {
  var user = FactoryGuy.make('user');

  store.find('user', user.id).then(function (user) {
    var projectJson = {title: 'project', user: user};

    store.createRecord('project', projectJson).save()
      .then(function (project) {
        return Ember.RSVP.all([project.get('user'), user.get('projects')]);
      }).then(function (promises) {
        var projectUser = promises[0], projects = promises[1];

        ok(projectUser == user);
        equal(projects.get('length'), 1);
        start();
      });
  });
});

asyncTest("#createRecord can work for one-to-none associations", function () {
  var user = FactoryGuy.make('user');

  store.find('user', user.id).then(function (user) {
    var smallCompanyJson = {name: 'small company', owner: user};

    store.createRecord('smallCompany', smallCompanyJson).save()
      .then(function (smallCompany) {
        return smallCompany.get('owner');
      }).then(function (owner) {
        equal(owner.get('id'), user.get('id'));
        start();
      });
  });
});

asyncTest("#createRecord adds hasMany association to records it hasMany of ", function () {
  var usersJson = FactoryGuy.makeList('user', 3);
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
