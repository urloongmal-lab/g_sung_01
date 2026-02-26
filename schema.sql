-- Enable the pgvector extension to work with embedding vectors
create extension if not exists vector;

-- Create the stars table
create table stars (
  id uuid default gen_random_uuid() primary key,
  content text not null,
  answer text not null,
  topic text,
  -- 3D Position in the universe (JSON or 3 separate columns, here using JSONB for flexibility)
  position_data jsonb not null,
  -- Vector embedding (768 dimensions for Gemini embeddings)
  embedding vector(768),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create a function to search for similar stars
create or replace function match_stars (
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
returns table (
  id uuid,
  content text,
  answer text,
  position_data jsonb,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    stars.id,
    stars.content,
    stars.answer,
    stars.position_data,
    1 - (stars.embedding <=> query_embedding) as similarity
  from stars
  where 1 - (stars.embedding <=> query_embedding) > match_threshold
  order by stars.embedding <=> query_embedding
  limit match_count;
end;
$$;