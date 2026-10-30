import type {Candidate,Programme} from '../src/core/types';
import {QlooAdapter,normalizeName,type Identity,type QueryEvidence} from './qloo';
export interface CulturalEvidence {
  source:'qloo-live'; capturedAt:string; identities:Identity[]; queries:QueryEvidence[];
  candidates:EvidenceCandidate[]; unsupported:{pair:{musicId:string;filmId:string};reason:string}[];
  calls:number;
}
export interface EvidenceCandidate extends Candidate {
  evidence:{artist:Identity;film:Identity;artistToFilmRank:number;filmToArtistRank:number;artistQuery:QueryEvidence;filmQuery:QueryEvidence;priority:string};
}
/** Product policy on contextual ordinal ranks, never an audience-overlap estimate. */
export function buildEvidence(programme:Programme,identities:Identity[],queries:QueryEvidence[],calls:number):CulturalEvidence {
  const candidates:EvidenceCandidate[]=[],unsupported:CulturalEvidence['unsupported']=[];
  for(const music of programme.sessions.filter(s=>s.kind==='music'))for(const film of programme.sessions.filter(s=>s.kind==='film')){
    const pair={musicId:music.id,filmId:film.id};
    const artistEntity=identities.find(e=>e.type==='artist'&&normalizeName(e.name)===normalizeName(music.title));
    const filmEntity=identities.find(e=>e.type==='movie'&&normalizeName(e.name)===normalizeName(film.title)&&e.year===film.year);
    const a=queries.find(q=>q.parameters['signal.interests.entities']===artistEntity?.id);
    const f=queries.find(q=>q.parameters['signal.interests.entities']===filmEntity?.id);
    const ar=a?.results.find(e=>e.id===filmEntity?.id)?.rank,fr=f?.results.find(e=>e.id===artistEntity?.id)?.rank;
    if(!artistEntity||!filmEntity||!a||!f||!ar||!fr){unsupported.push({pair,reason:'Missing identity or directional result; no rank was invented.'});continue;}
    if(Math.min(ar,fr)>2){unsupported.push({pair,reason:'Neither direction ranks in the top two of its four-entity shortlist.'});continue;}
    candidates.push({id:`${music.id}::${film.id}`,pair,evidence:{artist:artistEntity,film:filmEntity,artistToFilmRank:ar,filmToArtistRank:fr,artistQuery:a,filmQuery:f,priority:'Mutual top-two ranks first; then lower worst rank, lower best rank, canonical pair ID. Ordinal policy only; not audience overlap.'}});
  }
  candidates.sort((a,b)=>Math.max(a.evidence.artistToFilmRank,a.evidence.filmToArtistRank)-Math.max(b.evidence.artistToFilmRank,b.evidence.filmToArtistRank)||Math.min(a.evidence.artistToFilmRank,a.evidence.filmToArtistRank)-Math.min(b.evidence.artistToFilmRank,b.evidence.filmToArtistRank)||a.id.localeCompare(b.id));
  return {source:'qloo-live',capturedAt:queries[0]?.fetchedAt??new Date().toISOString(),identities,queries,candidates,unsupported,calls};
}
export async function gatherEvidence(programme:Programme,client:QlooAdapter):Promise<CulturalEvidence> {
  const identities:Identity[]=[],queries:QueryEvidence[]=[];
  for(const s of programme.sessions){const result=await client.resolve(s.title,s.entityType,s.year);identities.push(result.identity);queries.push(result.evidence);}
  for(const signal of identities)queries.push(await client.rank(signal,identities.filter(e=>e.type!==signal.type)));
  return buildEvidence(programme,identities,queries,client.calls);
}
