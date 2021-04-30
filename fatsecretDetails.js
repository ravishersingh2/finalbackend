var mongoose=require('mongoose');
var Schema = mongoose.Schema;

mongoose.Promise= global.Promise;
try {
    mongoose.connect( process.env.DB, {useNewUrlParser: true, useUnifiedTopology: true}, () =>
        console.log("connected"));
}catch (error) {
    console.log("could not connect");
}
mongoose.set('useCreateIndex', true);

var fatsecretDetailsSchema = new Schema({
    food:{type: String, required : true},
    cal:{type: String, required : true},
    carb:{type: String, required : true},
    prot:{type: String, required : true},
    fat:{type: String, required : true},
    sod:{type: String, required : true},
    fibr:{type: String, required : true},
    sugr:{type: String, required : true},
    vita:{type: String, required : true},
});

module.exports = mongoose.model('fatsecretDetails',fatsecretDetailsSchema,"fatsecretDetails");