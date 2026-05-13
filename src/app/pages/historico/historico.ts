import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { StateService } from '../../core/state';
import { collection, query, where, getDocs } from 'firebase/firestore';

@Component({
  selector: 'app-historico',
  standalone: true,
  imports: [CommonModule],
  providers: [DatePipe],
  templateUrl: './historico.html'
})
export class HistoricoComponent implements OnInit {
  public state = inject(StateService);
  private router = inject(Router);
  
  // INJETANDO O ATUALIZADOR DE TELA
  private cdr = inject(ChangeDetectorRef);

  historicoPedidos: any[] = [];
  carregandoHistorico = true;

  ngOnInit() {
    if (!this.state.usuarioLogado) {
      this.router.navigate(['/login']);
      return;
    }
    this.buscarHistorico();
  }

  async buscarHistorico() {
    if (this.state.db) {
      try {
        const pedidosRef = collection(this.state.db, 'pedidos');
        // A query já está perfeita, buscando só o que pertence ao cliente logado
        const q = query(pedidosRef, where("clienteEmail", "==", this.state.usuarioLogado.email));
        const querySnapshot = await getDocs(q);
        
        const pedidosEncontrados: any[] = [];
        querySnapshot.forEach((doc) => {
          pedidosEncontrados.push({ id: doc.id, ...doc.data() });
        });

        // Ordenando do mais recente para o mais antigo
        pedidosEncontrados.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
        this.historicoPedidos = pedidosEncontrados;
      } catch (e: any) {
        console.error("Erro ao buscar histórico:", e);
        // Adicionei um alerta caso o Firebase bloqueie algo por segurança no futuro
        alert("Não foi possível carregar os pedidos. Verifique sua conexão.");
      }
    }
    
    this.carregandoHistorico = false; // Finaliza o loading
    this.cdr.detectChanges();
  }

  irPara(rota: string) {
    this.router.navigate([rota]);
  }
}