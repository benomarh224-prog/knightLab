import {createAuthClient} from '@neon/auth';
export function createROQVYNAuth(origin=location.origin){return createAuthClient(origin+'/api/auth');}
