'use client'
import { useState } from 'react'
import { createClient } from '@/utils/supabase/client' // Ensure this import is fixed!

export default function EntryPage({ params }: { params: { type: string } }) {
  // 1. Your State Variables (these must match the names in handleSave)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [entity, setEntity] = useState('')
  const [product, setProduct] = useState('')
  const [value, setValue] = useState('')
  const entityType = params.type === 'sale' ? 'customer' : 'vendor'

  const supabase = createClient()

  // 2. PASTE THE handleSave FUNCTION HERE
  const handleSave = async () => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return alert("Please login first");

    // Get or Create Entity
    const { data: ent, error: entErr } = await supabase
      .from('entities')
      .upsert({ name: entity, type: entityType, user_id: userId }, { onConflict: 'user_id, name, type' })
      .select()
      .single();

    // Get or Create Product
    const { data: prod, error: prodErr } = await supabase
      .from('products')
      .upsert({ name: product, user_id: userId }, { onConflict: 'user_id, name' })
      .select()
      .single();

    if (ent && prod) {
      // Save Transaction
      const { error } = await supabase.from('transactions').insert({
        user_id: userId,
        date: date,
        entity_id: ent.id,
        product_id: prod.id,
        value: parseFloat(value),
        type: params.type
      });

      if (!error) {
        alert("Saved successfully!");
        setEntity(''); setProduct(''); setValue(''); // Clear fields after save
      }
    }
  };

  return (
    <div>
      {/* ... your form HTML ... */}
      <button onClick={handleSave}>Save Entry</button>
    </div>
  )
}