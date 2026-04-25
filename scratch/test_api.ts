import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:3000/api', // assuming it's proxied
  headers: {
    'Accept': 'application/json',
    // We might need a token, but let's see if we get a 401 or 500
  }
})

async function test() {
  try {
    const r1 = await api.get('/v1/sales/customers?page=1')
    console.log('Customers:', r1.status, typeof r1.data.data)
  } catch (e) {
    console.log('Customers failed:', e.response?.status)
  }

  try {
    const r2 = await api.get('/v1/inventory/items?page=1')
    console.log('Items:', r2.status, typeof r2.data.data)
  } catch (e) {
    console.log('Items failed:', e.response?.status)
  }

  try {
    const r3 = await api.get('/platform/v1/tenants?page=1')
    console.log('Platform Tenants:', r3.status, typeof r3.data.data)
  } catch (e) {
    console.log('Platform Tenants failed:', e.response?.status)
  }
}

test()
