/** A tab opened before a redeploy asks for hashed chunks that no longer exist; each browser words the failed import differently. */
export const GAME_UPDATED_COACH='The game was updated. Reload the page to talk to your corner.';
export function isStaleChunkError(error:unknown):boolean{
 const text=error instanceof Error?`${error.name} ${error.message}`:String(error??'');
 return /dynamically imported module|Importing a module script failed|error loading dynamically imported module|ChunkLoadError|Loading chunk \S+ failed|Unable to preload CSS/i.test(text);
}
