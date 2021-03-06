var mongoose = require('mongoose');
var uniqueValidator = require('mongoose-unique-validator');

var Schema = mongoose.Schema;

var tagSchema = new Schema({
    nome: {
        type: String,
        unique: true,
        required: true
    }
});


module.exports = mongoose.model('tags', tagSchema);