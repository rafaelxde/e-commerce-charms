import { Routes } from '@angular/router';
import { LojaComponent } from './pages/loja/loja';
import { LoginComponent } from './pages/login/login';
import { ProdutoComponent } from './pages/produto/produto';
import { AdminComponent } from './pages/admin/admin';
import { ComprovanteComponent } from './pages/comprovante/comprovante';
import { HistoricoComponent } from './pages/historico/historico';

export const routes: Routes = [
  { path: '', component: LojaComponent }, 
  { path: 'login', component: LoginComponent },
  { path: 'produto', component: ProdutoComponent },
  { path: 'admin', component: AdminComponent },
  { path: 'comprovante', component: ComprovanteComponent },
  { path: 'historico', component: HistoricoComponent },
  { path: '**', redirectTo: '' } 
];