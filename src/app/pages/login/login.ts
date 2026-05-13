import { Component, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { StateService } from '../../core/state';
import { GoogleAuthProvider, signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';

declare var lucide: any; // Adicionado para o Angular reconhecer a biblioteca de ícones

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html'
})
export class LoginComponent {
  public state = inject(StateService);
  public router = inject(Router);
  
  // INJETANDO O ATUALIZADOR DE TELA
  private cdr = inject(ChangeDetectorRef);

  modoAuth: 'login' | 'cadastro' = 'login';
  authEmail = '';
  authSenha = '';
  authTelefone = '';
  authBairro = '';
  authNumero = '';
  authComp = '';
  erroEmail = false;

  completandoCadastroGoogle = false;
  googleUserTemp: any = null;
  
  editandoEndereco = false;
  editTelefone = '';
  editBairro = '';
  editNumero = '';
  editComp = '';

  // --- NOVO: CONTROLE DO OLHINHO DA SENHA ---
  mostrarSenha = false;

  alternarSenha() {
    this.mostrarSenha = !this.mostrarSenha;
    
    // Avisa o Lucide para atualizar o ícone após a mudança
    setTimeout(() => {
      if (typeof lucide !== 'undefined') {
        lucide.createIcons();
      }
    }, 0);
  }

  // --- VARIÁVEIS DE RECUPERAÇÃO DE SENHA ---
  modoRecuperacao = false;
  emailRecuperacao = '';
  mensagemRecuperacao = '';
  erroRecuperacao = '';
  enviandoRecuperacao = false;

  // --- FUNÇÕES DE RECUPERAÇÃO ---
  alternarModoRecuperacao() {
    this.modoRecuperacao = !this.modoRecuperacao;
    this.erroRecuperacao = '';
    this.mensagemRecuperacao = '';
    this.emailRecuperacao = this.authEmail || ''; 
  }

  segundosRestantes = 0;

  async enviarLinkRecuperacao() {
    if (this.segundosRestantes > 0) return; // Trava o clique se o tempo não acabou

    this.erroRecuperacao = '';
    this.mensagemRecuperacao = '';

    if (!this.emailRecuperacao) {
      this.erroRecuperacao = 'Digite seu e-mail.';
      return;
    }

    this.enviandoRecuperacao = true;
    const resultado = await (this.state as any).redefinirSenha(this.emailRecuperacao);

    if (resultado.sucesso) {
      this.mensagemRecuperacao = 'Link enviado! Você pode pedir um novo em 60s.';
      
      // INICIA O CRONÔMETRO DE SEGURANÇA
      this.segundosRestantes = 60;
      const intervalo = setInterval(() => {
        this.segundosRestantes--;
        if (this.segundosRestantes <= 0) clearInterval(intervalo);
        this.cdr.detectChanges();
      }, 1000);

    } else {
      this.erroRecuperacao = resultado.erro;
    }
    
    this.enviandoRecuperacao = false;
    this.cdr.detectChanges();
  }

  irPara(rota: string) {
    this.router.navigate([rota]);
    window.scrollTo(0,0);
  }

  alternarModoAuth() {
    this.modoAuth = this.modoAuth === 'login' ? 'cadastro' : 'login';
    this.authEmail = ''; this.authSenha = ''; this.authTelefone = ''; this.erroEmail = false;
    this.mostrarSenha = false; // Esconde a senha ao trocar de tela
  }

  validarEmail() {
    if (!this.authEmail) { this.erroEmail = false; return; }
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    this.erroEmail = !regex.test(this.authEmail);
  }

  async loginComGoogle() {
    if (!this.state.auth) return;
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(this.state.auth, provider);
      const email = result.user.email;

      if (this.state.db && email) {
        const docRef = doc(this.state.db, 'usuarios', email);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          this.state.usuarioLogado = docSnap.data();
          this.irPara('/');
        } else {
          this.googleUserTemp = { email: email, nome: result.user.displayName };
          this.completandoCadastroGoogle = true;
          this.cdr.detectChanges();
        }
      }
    } catch (error) { alert("Erro ao conectar com o Google."); }
  }

  async finalizarCadastroGoogle() {
    if (!this.authBairro || !this.authNumero || !this.authTelefone) {
      alert("Telefone, Bairro e Número são obrigatórios."); return;
    }
    const novoUsuario = {
      email: this.googleUserTemp.email, senha: 'google-login', telefone: this.authTelefone,
      bairro: this.authBairro, numero: this.authNumero, comp: this.authComp
    };
    if (this.state.db) { await setDoc(doc(this.state.db, 'usuarios', novoUsuario.email), novoUsuario); }
    this.state.usuarioLogado = novoUsuario;
    this.completandoCadastroGoogle = false;
    this.irPara('/');
  }

  async executarAuth() {
    this.validarEmail();
    if (this.erroEmail || !this.authEmail || !this.authSenha) { alert("Preencha corretamente."); return; }

    if (this.modoAuth === 'cadastro') {
      if (!this.authBairro || !this.authNumero || !this.authTelefone) { alert("Dados obrigatórios faltando."); return; }
      try {
        await createUserWithEmailAndPassword(this.state.auth, this.authEmail, this.authSenha);
        const novoUsuario = { email: this.authEmail, telefone: this.authTelefone, bairro: this.authBairro, numero: this.authNumero, comp: this.authComp, isAdmin: false };
        if (this.state.db) await setDoc(doc(this.state.db, 'usuarios', this.authEmail), novoUsuario);
        this.state.usuarioLogado = novoUsuario;
        this.irPara('/');
      } catch (error: any) { 
        console.error("Erro detalhado do Firebase:", error);
        if (error.code === 'auth/email-already-in-use') {
          alert("Este e-mail já está cadastrado! Clique em 'Já possui conta?' para fazer login.");
        } else if (error.code === 'auth/weak-password') {
          alert("A senha é muito fraca. Ela deve ter pelo menos 6 caracteres.");
        } else if (error.code === 'auth/operation-not-allowed') {
          alert("O login por E-mail e Senha não está ativado no painel do Firebase!");
        } else {
          alert("Erro ao criar conta: " + error.message);
        }
      }
    } else {
      try {
        await signInWithEmailAndPassword(this.state.auth, this.authEmail, this.authSenha);
        const docSnap = await getDoc(doc(this.state.db, 'usuarios', this.authEmail));
        if (docSnap.exists()) {
          this.state.usuarioLogado = docSnap.data();
          this.state.isAdmin = this.state.usuarioLogado['isAdmin'] === true;
          this.irPara(this.state.isAdmin ? '/admin' : '/');
        }
      } catch (error: any) { 
        alert("E-mail ou senha incorretos."); 
      }
    }
  }

  async fazerLogout() {
    await this.state.deslogar(); //
    this.irPara('/');
  }

  iniciarEdicaoEndereco() {
    this.editTelefone = this.state.usuarioLogado.telefone || '';
    this.editBairro = this.state.usuarioLogado.bairro;
    this.editNumero = this.state.usuarioLogado.numero;
    this.editComp = this.state.usuarioLogado.comp || '';
    this.editandoEndereco = true;
  }

  async salvarEndereco() {
    if (!this.editBairro || !this.editNumero || !this.editTelefone) return;
    this.state.usuarioLogado.telefone = this.editTelefone;
    this.state.usuarioLogado.bairro = this.editBairro;
    this.state.usuarioLogado.numero = this.editNumero;
    this.state.usuarioLogado.comp = this.editComp;
    this.editandoEndereco = false;

    if (this.state.db && !this.state.isAdmin) {
      await updateDoc(doc(this.state.db, 'usuarios', this.state.usuarioLogado.email), {
        telefone: this.editTelefone, bairro: this.editBairro, numero: this.editNumero, comp: this.editComp
      });
    }
  }
}