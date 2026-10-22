import { supabase } from '../lib/supabase';
import { invalidateCache } from './requestCache';

export const moveAdminItemToPosition = async ({ scope, itemId, position, recordType, parentId }) => {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { error } = await supabase.rpc('admin_move_item_position', {
    p_scope: scope,
    p_item_id: String(itemId),
    p_target_position: position,
    p_record_type: recordType || null,
    p_parent_id: parentId || null,
  });
  if (error) {
    if (['PGRST202', '42883'].includes(error.code)) {
      throw new Error('The admin position database migration is missing. Run supabase/admin_position_reordering.sql in the Supabase SQL editor.');
    }
    throw error;
  }
  invalidateCache('catalog:');
};
