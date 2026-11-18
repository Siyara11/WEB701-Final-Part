// components/ProductForm.js
// Members register a new product/service, or edit an existing one (Requirement 2).
import React, { useState, useEffect } from 'react';

const empty = { name: '', description: '', type: 'product', quantity: 1, tokensRequired: 1 };

function ProductForm({ editing, onSave, onCancel }) {
  const [form, setForm] = useState(empty);

  // When the user clicks "Edit" on a product, load its values into the form
  useEffect(() => { setForm(editing ? { ...empty, ...editing } : empty); }, [editing]);

  // Functional update (f => ...) always uses the latest state, so a value typed right after
  // the form is loaded cannot overwrite it with stale data (bug found during testing)
  const handleChange = e => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    // Convert number inputs (strings) to numbers before sending to the API
    const ok = await onSave({ ...form, quantity: Number(form.quantity), tokensRequired: Number(form.tokensRequired) });
    if (ok && !editing) setForm(empty);
  };

  return (
    <div className="card">
      <h3>{editing ? 'Edit product / service' : 'Register a product or service'}</h3>
      <form onSubmit={handleSubmit} className="grid-form">
        <input name="name" placeholder="Name (e.g. Bread)" value={form.name} onChange={handleChange} required />
        <select name="type" value={form.type} onChange={handleChange}>
          <option value="product">Product</option>
          <option value="service">Service</option>
        </select>
        <input name="description" placeholder="Short description" value={form.description} onChange={handleChange} />
        <label>Quantity
          <input name="quantity" type="number" min="0" value={form.quantity} onChange={handleChange} required />
        </label>
        <label>Tokens per unit
          <input name="tokensRequired" type="number" min="1" value={form.tokensRequired} onChange={handleChange} required />
        </label>
        <div className="form-actions">
          <button type="submit" className="primary-btn">{editing ? 'Save changes' : 'Add'}</button>
          {editing && <button type="button" className="secondary-btn" onClick={onCancel}>Cancel</button>}
        </div>
      </form>
    </div>
  );
}

export default ProductForm;
