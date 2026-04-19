import { supabase } from './supabaseClient';

export async function loadEvaluations(userId) {
  const { data, error } = await supabase
    .from('evaluations')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return data.map(row => ({
    id: row.id,
    idea: row.idea,
    score: row.score,
    risk: row.risk,
    date: row.date,
    report: row.report,
  }));
}

export async function saveEvaluation(userId, entry) {
  const { data, error } = await supabase
    .from('evaluations')
    .insert({
      user_id: userId,
      idea: entry.idea,
      score: entry.score,
      risk: entry.risk,
      date: entry.date,
      report: entry.report,
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

export async function clearEvaluations(userId) {
  const { error } = await supabase
    .from('evaluations')
    .delete()
    .eq('user_id', userId);
  if (error) throw error;
}
