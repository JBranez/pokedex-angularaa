import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, of, shareReplay } from 'rxjs';

const API = 'https://pokeapi.co/api/v2';

export interface PokemonItem {
  id: number;
  name: string;
  sprite: string;
}

export interface PokemonDetail {
  id: number;
  name: string;
  height: number;
  weight: number;
  types: { type: { name: string } }[];
  abilities: { ability: { name: string } }[];
  stats: { base_stat: number; stat: { name: string } }[];
  sprites: { other: { 'official-artwork': { front_default: string } } };
}

export const GENERATIONS = [
  { label: 'Gen I (Kanto)', from: 1, to: 151 },
  { label: 'Gen II (Johto)', from: 152, to: 251 },
  { label: 'Gen III (Hoenn)', from: 252, to: 386 },
  { label: 'Gen IV (Sinnoh)', from: 387, to: 493 },
  { label: 'Gen V (Unova)', from: 494, to: 649 },
  { label: 'Gen VI (Kalos)', from: 650, to: 721 },
  { label: 'Gen VII (Alola)', from: 722, to: 809 },
  { label: 'Gen VIII (Galar)', from: 810, to: 905 },
  { label: 'Gen IX (Paldea)', from: 906, to: 1025 },
];

const idFromUrl = (url: string) => Number(url.split('/').filter(Boolean).pop());
const spriteFor = (id: number) =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;

@Injectable({ providedIn: 'root' })
export class PokemonService {
  private http = inject(HttpClient);
  private typeCache = new Map<string, Observable<Set<number>>>();

  /** Lista completa (nombre + id) en una sola petición. */
  readonly all$: Observable<PokemonItem[]> = this.http
    .get<{ results: { name: string; url: string }[] }>(`${API}/pokemon?limit=1025`)
    .pipe(
      map((r) =>
        r.results.map((p) => {
          const id = idFromUrl(p.url);
          return { id, name: p.name, sprite: spriteFor(id) };
        })
      ),
      shareReplay(1)
    );

  readonly types$: Observable<string[]> = this.http
    .get<{ results: { name: string }[] }>(`${API}/type`)
    .pipe(
      map((r) => r.results.map((t) => t.name).filter((n) => n !== 'unknown' && n !== 'stellar')),
      shareReplay(1)
    );

  /** IDs de los pokémon de un tipo (con caché). */
  idsByType(type: string): Observable<Set<number>> {
    if (!type) return of(new Set<number>());
    if (!this.typeCache.has(type)) {
      this.typeCache.set(
        type,
        this.http
          .get<{ pokemon: { pokemon: { url: string } }[] }>(`${API}/type/${type}`)
          .pipe(
            map((r) => new Set(r.pokemon.map((p) => idFromUrl(p.pokemon.url)))),
            shareReplay(1)
          )
      );
    }
    return this.typeCache.get(type)!;
  }

  detail(id: number): Observable<PokemonDetail> {
    return this.http.get<PokemonDetail>(`${API}/pokemon/${id}`);
  }
}
