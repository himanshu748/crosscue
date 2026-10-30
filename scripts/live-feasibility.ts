import {mkdir,writeFile} from 'node:fs/promises';
import {QlooAdapter,QlooError,type Identity,type QueryEvidence} from '../server/qloo';
const catalogue=[['Radiohead','artist'],['Björk','artist'],['Kendrick Lamar','artist'],['Daft Punk','artist'],['Spirited Away','movie',2001],['Moonlight','movie',2016],['Whiplash','movie',2014],['Blade Runner','movie',1982]] as const;
const identities:Identity[]=[],evidence:QueryEvidence[]=[];
const client=new QlooAdapter({apiKey:process.env.QLOO_API_KEY??'',baseUrl:process.env.QLOO_BASE_URL,beforeRequest:()=>new Promise(r=>setTimeout(r,700)),onEvidence:async e=>{evidence.push(e);}});
await mkdir('evidence',{recursive:true});
try{
 for(const row of catalogue){const resolved=await client.resolve(row[0],row[1],row.length===3?row[2]:undefined);identities.push(resolved.identity);console.log('Resolved',resolved.identity);}
 for(const signal of identities){const result=await client.rank(signal,identities.filter(e=>e.type!==signal.type));console.log(signal.name,'->',result.results.map(e=>`${e.rank}. ${e.name}`).join(', '),'missing:',result.missingIds.length);if(result.results.length!==4||result.missingIds.length)throw new QlooError('incomplete_coverage',`Live feasibility requires all four shortlist targets for ${signal.name}; observed ${result.results.length}.`,422);}
 await writeFile('evidence/qloo-live.json',JSON.stringify({status:'live_api_verified',capturedAt:new Date().toISOString(),calls:client.calls,identities,evidence},null,2)+'\n');
 console.log('Live identities and directional coverage recorded. Scheduling consequence gate remains separate.');
}catch(error){
 const failure=error instanceof QlooError?{code:error.code,message:error.message}:{code:'unexpected_error',message:'Unexpected local error'};
 await writeFile('evidence/qloo-live-attempt.json',JSON.stringify({status:'failed',capturedAt:new Date().toISOString(),calls:client.calls,identities,evidence,failure},null,2)+'\n');
 console.error(failure);process.exitCode=1;
}
