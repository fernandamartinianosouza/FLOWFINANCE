import { supabase } from '../lib/supabase';

const BUCKET_NAME = 'flowfinance-anexos';

export const uploadAnexoProcesso = async (
  file: File,
  processoId: string
) => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${processoId}/${crypto.randomUUID()}.${fileExt}`;

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) throw error;

  const { data: publicUrlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(data.path);

  return {
    nome: file.name,
    path: data.path,
    url: publicUrlData.publicUrl,
  };
};

export const excluirAnexoProcesso = async (path: string) => {
  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([path]);

  if (error) throw error;
};