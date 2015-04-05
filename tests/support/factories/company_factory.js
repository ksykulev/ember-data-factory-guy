FactoryGuy.define("company", {
  default: {
    name: 'Silly corp'
  },
  traits: {
    with_profile: {
      profile: {}
    },
    with_projects: {
      projects: FactoryGuy.hasMany('project', 2)
    }
  }

})

FactoryGuy.define("smallCompany", {
  default: {
    name: 'Small Corp',
    projects: FactoryGuy.hasMany('project', 2)
  }
})
