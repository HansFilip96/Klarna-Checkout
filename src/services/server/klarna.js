import { getItemDescriptor } from '@babel/core/lib/config/item';
import fetch from 'node-fetch';

function getKlarnaAuth() {
	const username = process.env.PUBLIC_KEY;
	const password = process.env.SECRET_KEY;
	const auth = 'Basic ' + Buffer.from(username + ':' + password).toString('base64');
	return auth;
}

function formatAsOrderLines(currentCart) {
	currentCart.forEach((item) => {
		item.total_amount = item.quantity * item.unit_price;
		item.total_tax_amount = item.total_amount - (item.total_amount * 10000) / (10000 + item.tax_rate);
	});
	return currentCart;
}

function formatProduct({ product, quantity }) {
	return {
		type: 'physical',
		reference: product.id,
		name: product.title,
		quantity,
		quantity_unit: 'pcs',
		unit_price: parseInt(product.price) * 100,
		tax_rate: 2500,
		total_amount: parseInt(product.price) * 100 * 1,
		total_discount_amount: 0,
		image_url: product.image
	};
}

// 1. Add async createOrder function that returns Klarna response.json()
async function createOrder(products) {
	const formattedProducts = products.map(formatProduct);
	const order_lines = formatAsOrderLines(formattedProducts);

	let order_amount = 0;
	let order_tax_amount = 0;
	order_lines.forEach((product) => {
		order_amount += product.total_amount;
		order_tax_amount += product.total_tax_amount;
	});

	const path = '/checkout/v3/orders';
	const auth = getKlarnaAuth();

	const url = process.env.BASE_URL + path;
	const method = 'POST';
	const headers = {
		'Content-Type': 'application/json',
		Authorization: auth
	};

	const payload = {
		purchase_country: 'SE',
		purchase_currency: 'SEK',
		locale: 'sv-SE',
		order_amount: order_amount,
		order_tax_amount: order_tax_amount,
		order_lines: order_lines,
		merchant_urls: {
			terms: 'https://www.example.com/terms.html',
			checkout: 'https://www.example.com/checkout.html',
			confirmation: `${process.env.CONFIRMATION_URL}/confirmation?order_id={checkout.order.id}`,
			push: 'https://www.example.com/api/push'
		}
	};

	const body = JSON.stringify(payload);
	const response = await fetch(url, { method, headers, body });
	if (response.status === 200 || response.status === 201) {
		const jsonRespons = await response.json();
		return jsonRespons;
	} else {
		console.error('Error', response.status, response.statusText);
		return {
			html_snippet: `<h1>${response.status} ${response.statusText}</h1>`
		};
	}
}

async function retrieveOrder(id) {
	const path = `/checkout/v3/orders/${id}`;
	const auth = getKlarnaAuth();
	const url = process.env.BASE_URL + path;
	const method = 'GET';
	const headers = {
		'Content-Type': 'application/json',
		Authorization: auth
	};
	const response = await fetch(url, { method, headers });

	if (response.status === 200 || response.status === 201) {
		const jsonRespons = await response.json();
		return jsonRespons;
	} else {
		console.error('Error', response.status, response.statusText);
		return {
			html_snippet: `<h1>${response.status} ${response.statusText}</h1>`
		};
	}
}

module.exports = { getKlarnaAuth, createOrder, retrieveOrder };
