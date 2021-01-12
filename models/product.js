var mongoose = require('mongoose');

var productSchema = new mongoose.Schema({
    name: String,
    price: Number,
    image: String,
    reviews: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Review'
        }
    ],
    category: String
});

module.exports = mongoose.model('Product', productSchema);