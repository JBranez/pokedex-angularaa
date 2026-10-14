import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TitleCasePipe } from '@angular/common';
import { GENERATIONS, PokemonDetail, PokemonItem, PokemonService } from './pokemon.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FormsModule, TitleCasePipe],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnInit {
  private api = inject(PokemonService);
  readonly generations = GENERATIONS;
  readonly pageSize = 24;

  all = signal<PokemonItem[]>([]);
  types = signal<string[]>([]);
  typeIds = signal<Set<number> | null>(null);

  search = signal('');
  type = signal('');
  gen = signal('');
  sort = signal<'id' | 'name'>('id');
  shown = signal(this.pageSize);

  loading = signal(true);
  error = signal('');
  selected = signal<PokemonDetail | null>(null);

  filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    const ids = this.typeIds();
    const g = this.gen() === '' ? null : this.generations[+this.gen()];
    let list = this.all().filter(
      (p) =>
        (!q || p.name.includes(q) || String(p.id) === q) &&
        (!ids || ids.has(p.id)) &&
        (!g || (p.id >= g.from && p.id <= g.to))
    );
    if (this.sort() === 'name') list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    return list;
  });

  visible = computed(() => this.filtered().slice(0, this.shown()));

  ngOnInit() {
    this.api.all$.subscribe({
      next: (list) => {
        this.all.set(list);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudo conectar con pokeapi.co');
        this.loading.set(false);
      },
    });
    this.api.types$.subscribe((t) => this.types.set(t));
  }

  onType(type: string) {
    this.type.set(type);
    this.resetPage();
    if (!type) return this.typeIds.set(null);
    this.api.idsByType(type).subscribe((ids) => this.typeIds.set(ids));
  }

  resetPage() {
    this.shown.set(this.pageSize);
  }

  clear() {
    this.search.set('');
    this.gen.set('');
    this.sort.set('id');
    this.onType('');
  }

  open(p: PokemonItem) {
    this.api.detail(p.id).subscribe((d) => this.selected.set(d));
  }

  close() {
    this.selected.set(null);
  }

  art(d: PokemonDetail) {
    return d.sprites.other['official-artwork'].front_default;
  }
}
