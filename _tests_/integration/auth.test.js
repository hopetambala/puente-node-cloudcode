const { cloudFunctions } = require('../run-cloud');
const { MongoClient } = require('mongodb');

describe('role testing', () => {
    let connection;
    let db;
    let adminRoleID;
    let contribRoleID;

    beforeAll(async () => {
        connection = await MongoClient.connect(process.env.MONGO_URL, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        db = await connection.db();
    });

    afterAll(async () => {
        await connection.close();
        await db.close();
    });

    it('should add a user with admin role', async () => {
        const credentials = {
            firstname: 'Dany',
            lastname: 'Targaryen',
            username: 'dragon_queen',
            password: 'dracarys',
            email: 'bendtheknee@gmail.com',
            organization: 'got'
        }
        return cloudFunctions.signup(credentials).then((result) => {
            let jsonString = JSON.stringify(result)
            let jsonValues = JSON.parse(jsonString);
            console.log(jsonValues);

            expect(jsonValues['firstname']).toEqual('Dany');
            expect(jsonValues['lastname']).toEqual('Targaryen');
            expect(jsonValues['username']).toEqual('dragon_queen');
            expect(jsonValues['email']).toEqual('bendtheknee@gmail.com');
            expect(jsonValues['organization']).toEqual('got');
            expect(jsonValues['role']).toEqual('administrator');
            expect(jsonValues['adminVerified']).toEqual(true);
            adminRoleID = jsonValues['objectId'];
        });
    });

    it('should add a user to same orginzation with contributor role', async () => {
        const credentials = {
            firstname: 'Jon',
            lastname: 'Snow',
            username: 'king_in_the_north',
            password: 'ghost',
            email: 'iknownothing@gmail.com',
            organization: 'got'
        }
        return cloudFunctions.signup(credentials).then((result) => {
            let jsonString = JSON.stringify(result)
            let jsonValues = JSON.parse(jsonString);
            console.log(jsonValues);

            expect(jsonValues['firstname']).toEqual('Jon');
            expect(jsonValues['lastname']).toEqual('Snow');
            expect(jsonValues['username']).toEqual('king_in_the_north');
            expect(jsonValues['email']).toEqual('iknownothing@gmail.com');
            expect(jsonValues['organization']).toEqual('got');
            expect(jsonValues['role']).toEqual('contributor');
            expect(jsonValues['adminVerified']).toEqual(false);
            contribRoleID = jsonValues['objectId'];
        });
    });

    it('should sign the first user in -- with username', async () => {
        const credentials = {
            username: 'dragon_queen',
            password: 'dracarys'
        }

        return cloudFunctions.signin(credentials).then((result) => {
            let jsonString = JSON.stringify(result)
            let jsonValues = JSON.parse(jsonString);
            console.log(jsonValues);

            expect(jsonValues['firstname']).toEqual('Dany');
            expect(jsonValues['lastname']).toEqual('Targaryen');
            expect(jsonValues['username']).toEqual('dragon_queen');
            expect(jsonValues['email']).toEqual('bendtheknee@gmail.com');
            expect(jsonValues['organization']).toEqual('got');
            expect(jsonValues['role']).toEqual('administrator');
            expect(jsonValues['adminVerified']).toEqual(true);
            expect(jsonValues['objectId']).toEqual(adminRoleID)
        });
    });

    it('should sign the second user in -- with email', async () => {
        const credentials = {
            username: 'iknownothing@gmail.com',
            password: 'ghost'
        }

        return cloudFunctions.signin(credentials).then((result) => {
            let jsonString = JSON.stringify(result)
            let jsonValues = JSON.parse(jsonString);
            console.log(jsonValues);

            expect(jsonValues['firstname']).toEqual('Jon');
            expect(jsonValues['lastname']).toEqual('Snow');
            expect(jsonValues['username']).toEqual('king_in_the_north');
            expect(jsonValues['email']).toEqual('iknownothing@gmail.com');
            expect(jsonValues['organization']).toEqual('got');
            expect(jsonValues['role']).toEqual('contributor');
            expect(jsonValues['adminVerified']).toEqual(false);
            expect(jsonValues['objectId']).toEqual(contribRoleID);
        });
    });

    // it('should send a password reset link to the user', async () => {
    //     const credentials = {
    //         email: 'bendtheknee@gmail.com'
    //     }

    //     return cloudFunctions.forgotPassword(credentials).then((result) => {
    //         let jsonString = JSON.stringify(result)
    //         let jsonValues = JSON.parse(jsonString);
    //         console.log(jsonValues);
    //     });
    // });

});