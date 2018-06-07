var mongoose = require('mongoose');
var uniqueValidator = require('mongoose-unique-validator');

var Schema = mongoose.Schema;

var postSchema = new Schema({
    titulo: {
        type: String,
        required: true
    },
    posturl: {
        type: String,
        required: true,
        unique: true
    },
    conteudo: {
        type: String,
        required: true
    },
    Autor: {
        type: String,
        required: true
    },
    tags: [String],
    categoria: String,
    ImageURL: {
        type: String,
        default: '#'
    },
    exibicoes: {
        type: Number,
        default: 0
    },
    dataPublicacao: Date
});

postSchema.plugin(uniqueValidator);

module.exports = mongoose.model('Post', postSchema);