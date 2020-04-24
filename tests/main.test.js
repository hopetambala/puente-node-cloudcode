const cloudFunctions = require('../cloud/main')

//hello world
test('Hello World exists', async () => {
    // expect.assertions(1);
    // const data = await cloudFunctions.hello()
    expect(cloudFunctions.hello()).toBeDefined();
});

// test to ensure it is defined
test('Post Exists', async () => {
    expect(cloudFunctions.postObjectsToClass()).toBeDefined();
});

test('Post object - ASync', async () => {
    expect.assertions(1);
    post_params = {
        parseClass: "SurveyData",
        signature: "Joe",
        photoFile: "pictureofJoe",
        localObject: {
            fname: 'Michael',
            lname: 'Bouble'
        }
    }
    return cloudFunctions.postObjectsToClass(post_params)
        .then(result => {
            expect(result.fname).toEqual('Michael')
        })
})

test('Post objects - not async', async () => {
    expect.assertions(1);
    post_params = {
        parseClass: "SurveyData",
        signature: "Joe",
        photoFile: "pictureofJoe",
        localObject: {
            fname: 'Michael',
            lname: 'Bouble'
        }
    }
    const data = await cloudFunctions.postObjectsToClass(post_params)
    expect(data.fname).toEqual("Joe");
});


