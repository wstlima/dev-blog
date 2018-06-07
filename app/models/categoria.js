var mongoose = require('mongoose');
var ObjectId = require('mongodb').ObjectID;
var uniqueValidator = require('mongoose-unique-validator');
var Schema = mongoose.Schema;

var categoriaSchema = new Schema({
    nome: {
        _id: ObjectId(),
        type: String,
        unique: true,
        required: true
    }
});

categoriaSchema.plugin(uniqueValidator);

module.exports = mongoose.model('Categoria', categoriaSchema);