/*
CSC3916 HW2
File: Server.js
Description: Web API scaffolding for Movie API
 */

let envPath = __dirname + "/.env"
require('dotenv').config({path:envPath});
var express = require('express');
var bodyParser = require('body-parser');
var passport = require('passport');
var authController = require('./auth');
var authJwtController = require('./auth_jwt');
var jwt = require('jsonwebtoken');
var cors = require('cors');
var mongoose = require("mongoose")
const { uuid } = require('uuidv4');

var app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(passport.initialize());

var router = express.Router();
var fatsecretDetails = require('./fatsecretDetails');
var User = require('./Users');

router.post('/signin', function(req, res) {
    var userNew = new User();
    userNew.name = req.body.name;
    userNew.username = req.body.username;
    userNew.password = req.body.password;

    User.findOne({ username: userNew.username }).select('name username password').exec(function(err, user) {
        if (err) res.send(err);

        user.comparePassword(userNew.password, function(isMatch){
            if (isMatch) {
                var userToken = {id: user._id, username: user.username};
                var token = jwt.sign(userToken, process.env.SECRET_KEY);//change here
                res.json({success: true, token: 'JWT ' + token, userId:user._id});
            }
            else {
                res.status(401).send({success: false, message: 'Authentication failed.'});
            }
        });
    });
});

router.post('/signup', function(req, res) {
    if (!req.body.username || !req.body.password) {
        res.json({success: false, message: 'Please pass username and password.'});
    }
    else {
        var user = new User();
        user.name = req.body.name;
        user.username = req.body.username;
        user.password = req.body.password;
        // save the user
        user.save(function(err) {
            if (err) {
                // duplicate entry
                if (err.code == 11000)
                    return res.json({ success: false, message: 'A user with that username already exists. '});
                else
                    return res.send(err);
            }
            res.json({ success: true, message: 'User created!' });
        });
    }
});

router.route('/users/:userId')
    .get(authJwtController.isAuthenticated, function (req, res) {
        var id = req.params.userId;
        User.findById(id, function(err, user) {
            if (err) res.send(err);
            // return that user
            res.json(user);
        });
    });

router.post('/getFatSecretDetails', function(req, res) {
    fatsecretDetails.find({}, function(err, user) {
        if (err) res.send(err);
        // return that user
        res.json({data:user});
    });
});

router.post('/getEachDayData', function(req, res) {
    if(!req.body.label || !req.body.userId){
        return res.send({message:"error"})        
    }
    User.findById(req.body.userId, function(err, user) {
        if (err) res.send(err);
        // return that user
        let totals = []
        if(user && user['totals'] && Array.isArray(user['totals']) && user['totals'].length > 0){
            let eachDay = user['totals'].find(x=>x['label'] === req.body.label)
            if(eachDay){
                totals = eachDay
            }
        }
        res.json({data:totals});
    });
});

router.post('/deleteDayData', function(req, res) {
    if(!req.body.label || !req.body.userId || !req.body.servingId){
        res.send({message:"error"})
    }
    User.findById(req.body.userId, function(err, user) {
        if (err) res.send(err);
        // return that user
        
        if(user && user['totals'] && Array.isArray(user['totals']) && user['totals'].length > 0){
            user['totals'].forEach(x=>{
                if(x['label'] === req.body.label){
                    let eachDay = x
                    if(eachDay['totals'] && Array.isArray(eachDay['totals']) && eachDay['totals'].length > 0){
                        let servingInd = eachDay['totals'].findIndex(x=>x['_id'] === req.body.servingId)
                        if(servingInd !== -1){
                            eachDay['totals'].splice(servingInd,1)                            
                        }
                    }
                }
            })
            User.updateOne({_id:req.body.userId},{$set:{totals:user['totals']}}, function(err,user){
                if (err) res.send(err);
                res.json({message:"Successfully Deleted Food"})
            })
        }
        // res.json({message:success});
    });
});

router.post('/addDayData', function(req, res) {
    if(!req.body.label || !req.body.userId || !req.body.foodId || !req.body.quantity){
        res.send({message:"error"})
    }
    User.findById(req.body.userId, function(err, user) {
        if (err) res.send(err);
        // return that user
        fatsecretDetails.findById(req.body.foodId, function(err,eachFood){
            if (err) res.send(err);
            if(eachFood){
                delete eachFood['_id']
                console.log("eachFood", eachFood)
                if(user && user['totals'] && Array.isArray(user['totals']) && user['totals'].length > 0){
                    let foundDay = false
                    user['totals'].forEach(x=>{
                        if(x['label'] === req.body.label){
                            foundDay = true 
                        }
                    })
                    if(foundDay){
                        user['totals'].forEach(x=>{
                            if(x['label'] === req.body.label){
                                 x['totals'].push({
                                    ...JSON.parse(JSON.stringify(eachFood)),
                                     _id: uuid(),
                                     serving:req.body.quantity
                                 })
                            }
                        })
                    }else{
                        user['totals'].push({
                            label:req.body.label,
                            totals:[{
                                ...JSON.parse(JSON.stringify(eachFood)),
                                _id: uuid(),
                                serving:req.body.quantity
                            }]
                        })
                    }
                }else{
                    user['totals'] = [{
                        label:req.body.label,
                        totals:[{
                            ...JSON.parse(JSON.stringify(eachFood)),
                            _id: uuid(),
                            serving:req.body.quantity
                        }]
                    }]
                }
                User.updateOne({_id:req.body.userId},{$set:{totals:user['totals']}}, function(err,user){
                    if (err) res.send(err);
                    res.json({message:"Successfully Added New Food"})
                })
            }
        })
    });
});

router.post('/getWeekWiseData', function(req, res) {
    if(!req.body.userId){
        return res.send({message:"error"})        
    }
    User.findById(req.body.userId, function(err, user) {
        if (err) res.send(err);
        // return that user
        let totals = [{
            label:"2021-04-01"
        },{
            label:"2021-04-02"
        },{
            label:"2021-04-03"
        },{
            label:"2021-04-04"
        },{
            label:"2021-04-05"
        }]
        let finalData = []
        if(user['totals'] && Array.isArray(user['totals']) && user['totals'].length > 0){
            totals.forEach(x=>{
                user['totals'].forEach(y=>{
                    if(x['label'] === y['label']){
                        finalData.push({
                            label:y['label'],
                            totals:getTotals(y['totals'])
                        }) 
                    }
                })
            })
            let totalDay = JSON.parse(JSON.stringify(totals)).map(x=>x['label'])
            let usertotalDay = JSON.parse(JSON.stringify(user['totals'])).map(x=>x['label'])
            let notIn = totalDay.filter(x=>!usertotalDay.includes(x))
            let notInReverse = usertotalDay.filter(x=>!totalDay.includes(x))
            notIn.forEach(x=>{
                finalData.push({
                    label:x
                })
            })
            notInReverse.forEach(x=>{
                user['totals'].forEach(y=>{
                    if(x === y['label']){
                        finalData.push({
                            label:x,
                            totals:getTotals(y['totals'])
                        }) 
                    }
                })
            })
        }else{
            if(totals && Array.isArray(totals) && totals.length > 0){
                finalData = totals
            }
        }
        res.json({data:finalData});
    });
});

function getTotals(arrayData){
    let returnArr = []
    if(arrayData && Array.isArray(arrayData) && arrayData.length > 0){
        let calTotal = arrayData.filter(x=>x['cal']).map(x=>x && x['cal']).filter(Boolean).map(x=>x && x.replace(/[^\d.-]/g, '')).map(x=>Number(x)).reduce((a, b) => a + b, 0)
        let carbTotal = arrayData.filter(x=>x['carb']).map(x=>x && x['carb']).filter(Boolean).map(x=>x && x.replace(/[^\d.-]/g, '')).map(x=>Number(x)).reduce((a, b) => a + b, 0)
        let protTotal = arrayData.filter(x=>x['prot']).map(x=>x && x['prot']).filter(Boolean).map(x=>x && x.replace(/[^\d.-]/g, '')).map(x=>Number(x)).reduce((a, b) => a + b, 0)
        let fatTotal = arrayData.filter(x=>x['fat']).map(x=>x && x['fat']).filter(Boolean).map(x=>x && x.replace(/[^\d.-]/g, '')).map(x=>Number(x)).reduce((a, b) => a + b, 0)
        let sodTotal = arrayData.filter(x=>x['sod']).map(x=>x && x['sod']).filter(Boolean).map(x=>x && x.replace(/[^\d.-]/g, '')).map(x=>Number(x)).reduce((a, b) => a + b, 0)
        let fibrTotal = arrayData.filter(x=>x['fibr']).map(x=>x && x['fibr']).filter(Boolean).map(x=>x && x.replace(/[^\d.-]/g, '')).map(x=>Number(x)).reduce((a, b) => a + b, 0)
        let sugrTotal = arrayData.filter(x=>x['sugr']).map(x=>x && x['sugr']).filter(Boolean).map(x=>x && x.replace(/[^\d.-]/g, '')).map(x=>Number(x)).reduce((a, b) => a + b, 0)
        let vitaTotal = arrayData.filter(x=>x['vita']).map(x=>x && x['vita']).filter(Boolean).map(x=>x && x.replace(/[^\d.-]/g, '')).map(x=>Number(x)).reduce((a, b) => a + b, 0)
        returnArr.push({
            label:"Calorie",
            quantity:calTotal,
            extValue:"kcal"
        })
        returnArr.push({
            label:"Carbs",
            quantity:carbTotal,
            extValue:"g"
        })
        returnArr.push({
            label:"Protein",
            quantity:protTotal,
            extValue:"g"
        })
        returnArr.push({
            label:"Fat",
            quantity:fatTotal,
            extValue:"g"
        })
        returnArr.push({
            label:"Sodium",
            quantity:sodTotal,
            extValue:"g"
        })
        returnArr.push({
            label:"Fibre",
            quantity:fibrTotal,
            extValue:"g"
        })
        returnArr.push({
            label:"Sugar",
            quantity:sugrTotal,
            extValue:"g"
        })
        returnArr.push({
            label:"Vitamin",
            quantity:vitaTotal,
            extValue:"g"
        })
        returnArr = returnArr.filter(x=>x['quantity'])
    }
    return returnArr
}

//All other routes and methods
router.all('*', function(req, res) {
    res.json({
        error: 'Your HTTP method is not supported. Fix it please.👮‍'
    });
});

app.use('/', router);
app.listen(process.env.PORT || 8080);
module.exports = app; // for testing only