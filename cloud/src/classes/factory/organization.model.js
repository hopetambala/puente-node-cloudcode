class Organization extends Parse.Object {
  constructor() {
    super('Organization');
  }

  async create(attributes){
    const { name } = attributes
    const organization = new Organization();
    organization.set('name',name);
    return organization.save().then((organization) => organization, (error) => {
      console.log('Failed to create new object, with error code: ' + error.message);
    })
  }
}

module.exports = Organization
