//
let envPath = __dirname + "/../.env"
require('dotenv').config({path:envPath});
let chai = require('chai');
let chaiHttp = require('chai-http');
let server = require('../server');
let User = require('../Users');
chai.should();

chai.use(chaiHttp);

let login_details = {
    name: 'test',
    username: 'testuser@test.com',
    password: 'password'
}

let nutrition_details = {
    food: 'Rock (100g) Safeway',
    cal : '111',
    carb: '12',
    prot: '23',
    fat: '34',
    sod: '45',
    fibr: '56',
    sugr: '67'
}

describe('Register, Login and Call Test Collection with Basic Auth and JWT Auth', () => {
    beforeEach((done) => { //Before each test initialize the database to empty
        //db.userList = [];

        done();
    })
/*
    after((done) => { //after this test suite empty the database
        //db.userList = [];
        User.deleteOne({ name: 'test'}, function(err, user) {
            if (err) throw err;
        });
        done();
    })

 */

    //Test the GET route
    describe('/signup', () => {
        it('it should register, login and check our token', (done) => {
            chai.request(server)
                /*
                .post('/signup')
                .send(login_details)
                .end((err, res) =>{
                    console.log(JSON.stringify(res.body));
                    res.should.have.status(200);
                    res.body.success.should.be.eql(true);

                 */
                    //follow-up to get the JWT token
                    chai.request(server)
                        .post('/signin')
                        .send(login_details)
                        .end((err, res) => {
                            res.should.have.status(200);
                            res.body.should.have.property('token');
                            let token = res.body.token;
                            console.log(token);
                            done();

                            chai.request(server)
                                .post('/saveFatSecretDetails')
                                .send(nutrition_details)
                                .end((err, res) => {
      //                              res.should.have.status(200);
                                    res.body.should.have.property('token');
                                    let token = res.body.token;
                                    console.log(token);
                                    console.log(nutrition_details);
                                    done();
                                })
                        })
 //               })
        })
    });

});