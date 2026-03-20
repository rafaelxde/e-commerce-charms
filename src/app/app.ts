import { Component, AfterViewChecked, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Title, Meta } from '@angular/platform-browser';
import { initializeApp } from 'firebase/app';
// NOVO: Importamos GoogleAuthProvider e signInWithPopup
import { getAuth, signInAnonymously, onAuthStateChanged, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, updateDoc, query, where, getDocs } from 'firebase/firestore';

declare var lucide: any;

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [DatePipe],
  templateUrl: './app.html',
  styleUrls: ['../styles.css']
})
export class AppComponent implements OnInit, AfterViewChecked {
  private cdr = inject(ChangeDetectorRef);
  private titleService = inject(Title); 
  private metaService = inject(Meta);   

  // NAVEGAÇÃO
  telaAtual: 'loja' | 'login' | 'comprovante' | 'historico' = 'loja';

  // ESTADOS DE AUTENTICAÇÃO E PERFIL
  modoAuth: 'login' | 'cadastro' = 'login';
  authEmail = '';
  authSenha = '';
  authTelefone = ''; // <--- NOVO
  authBairro = '';
  authNumero = '';
  authComp = '';
  erroEmail = false;

  // ESTADOS DO GOOGLE
  completandoCadastroGoogle = false; // <--- NOVO: Controla a tela de pedir endereço pro Google
  googleUserTemp: any = null; // <--- NOVO: Guarda os dados do Google temporariamente
  
  // VARIÁVEIS DE EDIÇÃO DE ENDEREÇO
  editandoEndereco = false;
  editTelefone = ''; // <--- NOVO
  editBairro = '';
  editNumero = '';
  editComp = '';
  
  // ESTADOS DE DADOS
  usuarioLogado: any = null;
  pedidoRecente: any = null;
  historicoPedidos: any[] = [];
  carregandoHistorico = false;

  // --- FILTROS DE CATEGORIA ---
  categorias = ['Todos', 'Blusa', 'Cropped', 'Calça', 'Shorts', 'Body', 'Vestido', 'Saia', 'Macacão'];
  categoriaSelecionada = 'Todos';
  termoBusca = '';

  // IMAGENS E COLEÇÕES
  produtos: any[] = [
    // --- CONJUNTO 1 ---
    { nome: "Conjunto Tropical Completo (Camisa + Cropped + Calça)", categoria: "Conjunto", precoAntigo: "R$ 449,90", preco: "R$ 399,90", precoNum: 399.90, img: "/produtos/conjunto1.png", esconderNoTodos: false },
    { nome: "Camisa Botões Estampa Coqueiros", categoria: "Blusa", precoAntigo: "R$ 159,90", preco: "R$ 139,90", precoNum: 139.90, img: "/produtos/conjunto1.png", esconderNoTodos: true },
    { nome: "Cropped Básico Off-White", categoria: "Cropped", precoAntigo: "R$ 89,90", preco: "R$ 79,90", precoNum: 79.90, img: "/produtos/conjunto9.png", esconderNoTodos: true },
    { nome: "Calça Envelope Off-White", categoria: "Calça", precoAntigo: "R$ 199,90", preco: "R$ 179,90", precoNum: 179.90, img: "/produtos/conjunto9.png", esconderNoTodos: true },
    // --- CONJUNTO 2 ---
    { nome: "Conjunto Coqueiros (Colete Longo + Calça)", categoria: "Conjunto", precoAntigo: "R$ 359,90", preco: "R$ 319,90", precoNum: 319.90, img: "/produtos/conjunto2.png", esconderNoTodos: false },
    { nome: "Colete Longo Estampa Coqueiros", categoria: "Blusa", precoAntigo: "R$ 179,90", preco: "R$ 159,90", precoNum: 159.90, img: "/produtos/conjunto2.png", esconderNoTodos: true },
    { nome: "Calça Reta Estampa Coqueiros", categoria: "Calça", precoAntigo: "R$ 179,90", preco: "R$ 159,90", precoNum: 159.90, img: "/produtos/conjunto2.png", esconderNoTodos: true },
    // --- CONJUNTO 3 ---
    { nome: "Vestido Midi Estampa Coqueiros", categoria: "Vestido", precoAntigo: "R$ 259,90", preco: "R$ 229,90", precoNum: 229.90, img: "/produtos/conjunto3.png", esconderNoTodos: false },
    // --- CONJUNTOS 4, 5 E 6 ---
    { nome: "Camisa de Botões Azul Escura Clássica", categoria: "Blusa", precoAntigo: "R$ 169,90", preco: "R$ 149,90", precoNum: 149.90, img: "/produtos/conjunto4.png", esconderNoTodos: true },
    { nome: "Saia Palmeiras Transpassada", categoria: "Saia", precoAntigo: "R$ 199,90", preco: "R$ 179,90", precoNum: 179.90, img: "/produtos/conjunto4.png", esconderNoTodos: true },
    { nome: "Saia Curta Branca com Botões de Pérola", categoria: "Saia", precoAntigo: "R$ 189,90", preco: "R$ 169,90", precoNum: 169.90, img: "/produtos/conjunto6.png", esconderNoTodos: true },
    { nome: "Shorts de Alfaiataria Azul Escuro Clássico", categoria: "Shorts", precoAntigo: "R$ 159,90", preco: "R$ 139,90", precoNum: 139.90, img: "/produtos/conjunto5.png", esconderNoTodos: true },
    { nome: "Conjunto Azure Palms com Saia Transpassada (Camisa + Saia)", categoria: "Conjunto", precoAntigo: "R$ 369,90", preco: "R$ 329,90", precoNum: 329.90, img: "/produtos/conjunto4.png", esconderNoTodos: false },
    { nome: "Conjunto Azure Palms com Shorts (Camisa + Shorts)", categoria: "Conjunto", precoAntigo: "R$ 329,90", preco: "R$ 289,90", precoNum: 289.90, img: "/produtos/conjunto5.png", esconderNoTodos: false },
    { nome: "Conjunto Azure Palms com Saia de Botões (Camisa + Saia)", categoria: "Conjunto", precoAntigo: "R$ 359,90", preco: "R$ 319,90", precoNum: 319.90, img: "/produtos/conjunto6.png", esconderNoTodos: false },
    // --- CONJUNTOS 7, 8 E 9 ---
    { nome: "Vestido Riviera Estampa Costeira (Midi)", categoria: "Vestido", precoAntigo: "R$ 279,90", preco: "R$ 249,90", precoNum: 249.90, img: "/produtos/conjunto7.png", esconderNoTodos: false },
    { nome: "Macacão Riviera Linho Coastal", categoria: "Macacão", precoAntigo: "R$ 359,90", preco: "R$ 329,90", precoNum: 329.90, img: "/produtos/conjunto8.png", esconderNoTodos: false },
    { nome: "Conjunto Azure Riviera Off-White (Cropped + Calça)", categoria: "Conjunto", precoAntigo: "R$ 399,90", preco: "R$ 379,90", precoNum: 379.90, img: "/produtos/conjunto9.png", esconderNoTodos: false },
    // --- CONJUNTOS 10, 11, 12 ---
    { nome: "Vestido Off-White Mangas Laise Ombro a Ombro", categoria: "Vestido", precoAntigo: "R$ 289,90", preco: "R$ 259,90", precoNum: 259.90, img: "/produtos/conjunto10.png", esconderNoTodos: false },
    { nome: "Blusa Peplum Laise Off-White", categoria: "Blusa", precoAntigo: "R$ 159,90", preco: "R$ 139,90", precoNum: 139.90, img: "/produtos/conjunto11.png", esconderNoTodos: true },
    { nome: "Saia Midi Básica Off-White", categoria: "Saia", precoAntigo: "R$ 189,90", preco: "R$ 169,90", precoNum: 169.90, img: "/produtos/conjunto11.png", esconderNoTodos: true },
    { nome: "Bermuda de Alfaiataria Off-White", categoria: "Shorts", precoAntigo: "R$ 169,90", preco: "R$ 149,90", precoNum: 149.90, img: "/produtos/conjunto12.png", esconderNoTodos: true },
    { nome: "Conjunto Laise com Saia Midi (Blusa + Saia)", categoria: "Conjunto", precoAntigo: "R$ 349,80", preco: "R$ 309,80", precoNum: 309.80, img: "/produtos/conjunto11.png", esconderNoTodos: false },
    { nome: "Conjunto Laise com Bermuda (Blusa + Bermuda)", categoria: "Conjunto", precoAntigo: "R$ 329,80", preco: "R$ 289,80", precoNum: 289.80, img: "/produtos/conjunto12.png", esconderNoTodos: false },
    // --- CONJUNTOS 13, 14, 15 ---
    { nome: "Camisa de Botões Laranja Manga 3/4", categoria: "Blusa", precoAntigo: "R$ 169,90", preco: "R$ 149,90", precoNum: 149.90, img: "/produtos/conjunto13.png", esconderNoTodos: true },
    { nome: "Bermuda de Alfaiataria Off-White", categoria: "Shorts", precoAntigo: "R$ 169,90", preco: "R$ 149,90", precoNum: 149.90, img: "/produtos/conjunto13.png", esconderNoTodos: true },
    { nome: "Cropped Nó Frontal Estampa Floral Laranja", categoria: "Cropped", precoAntigo: "R$ 119,90", preco: "R$ 99,90", precoNum: 99.90, img: "/produtos/conjunto14.png", esconderNoTodos: true },
    { nome: "Saia Longa Fluida Estampa Floral Laranja", categoria: "Saia", precoAntigo: "R$ 219,90", preco: "R$ 199,90", precoNum: 199.90, img: "/produtos/conjunto14.png", esconderNoTodos: true },
    { nome: "Conjunto Alfaiataria Sunset (Camisa + Bermuda)", categoria: "Conjunto", precoAntigo: "R$ 339,80", preco: "R$ 299,80", precoNum: 299.80, img: "/produtos/conjunto13.png", esconderNoTodos: false },
    { nome: "Conjunto Floral Sunset Longo (Cropped + Saia)", categoria: "Conjunto", precoAntigo: "R$ 339,80", preco: "R$ 299,80", precoNum: 299.80, img: "/produtos/conjunto14.png", esconderNoTodos: false },
    { nome: "Vestido Midi Estampa Floral Sunset", categoria: "Vestido", precoAntigo: "R$ 269,90", preco: "R$ 249,90", precoNum: 249.90, img: "/produtos/conjunto15.png", esconderNoTodos: false },
    // --- CONJUNTOS 16, 17, 18 ---
    { nome: "Saia Midi Mostarda Evasê", categoria: "Saia", precoAntigo: "R$ 199,90", preco: "R$ 179,90", precoNum: 179.90, img: "/produtos/conjunto16.png", esconderNoTodos: true },
    { nome: "Cropped Mostarda com Botões Frontais", categoria: "Cropped", precoAntigo: "R$ 149,90", preco: "R$ 129,90", precoNum: 129.90, img: "/produtos/conjunto17.png", esconderNoTodos: true },
    { nome: "Camisa Cropped Mostarda Manga Curta", categoria: "Blusa", precoAntigo: "R$ 169,90", preco: "R$ 149,90", precoNum: 149.90, img: "/produtos/conjunto18.png", esconderNoTodos: true },
    { nome: "Bermuda Shorts Mostarda de Alfaiataria", categoria: "Shorts", precoAntigo: "R$ 179,90", preco: "R$ 159,90", precoNum: 159.90, img: "/produtos/conjunto18.png", esconderNoTodos: true },
    { nome: "Conjunto Mostarda Floral (Cropped + Saia)", categoria: "Conjunto", precoAntigo: "R$ 319,80", preco: "R$ 279,80", precoNum: 279.80, img: "/produtos/conjunto16.png", esconderNoTodos: false },
    { nome: "Conjunto Mostarda Elegance (Cropped + Saia)", categoria: "Conjunto", precoAntigo: "R$ 349,80", preco: "R$ 309,80", precoNum: 309.80, img: "/produtos/conjunto17.png", esconderNoTodos: false },
    { nome: "Conjunto Mostarda Safári (Camisa + Bermuda)", categoria: "Conjunto", precoAntigo: "R$ 349,80", preco: "R$ 309,80", precoNum: 309.80, img: "/produtos/conjunto18.png", esconderNoTodos: false },
    // --- CONJUNTOS 19, 20, 21 ---
    { nome: "Regata Branca com Detalhes", categoria: "Blusa", precoAntigo: "R$ 139,90", preco: "R$ 119,90", precoNum: 119.90, img: "/produtos/conjunto19.png", esconderNoTodos: true },
    { nome: "Calça Pantalona Branca Fluida", categoria: "Calça", precoAntigo: "R$ 219,90", preco: "R$ 199,90", precoNum: 199.90, img: "/produtos/conjunto19.png", esconderNoTodos: true },
    { nome: "Body Branco Um Ombro Só", categoria: "Body", precoAntigo: "R$ 119,90", preco: "R$ 99,90", precoNum: 99.90, img: "/produtos/conjunto20.png", esconderNoTodos: true },
    { nome: "Saia Midi Verde Sálvia Lastex", categoria: "Saia", precoAntigo: "R$ 199,90", preco: "R$ 179,90", precoNum: 179.90, img: "/produtos/conjunto20.png", esconderNoTodos: true },
    { nome: "Conjunto Pantalona Branco (Blusa + Calça)", categoria: "Conjunto", precoAntigo: "R$ 359,80", preco: "R$ 319,80", precoNum: 319.80, img: "/produtos/conjunto19.png", esconderNoTodos: false },
    { nome: "Conjunto Sálvia Elegance (Body + Saia)", categoria: "Conjunto", precoAntigo: "R$ 279,80", preco: "R$ 279,80", precoNum: 279.80, img: "/produtos/conjunto20.png", esconderNoTodos: false },
    { nome: "Vestido Midi Verde Sálvia Corset", categoria: "Vestido", precoAntigo: "R$ 289,90", preco: "R$ 259,90", precoNum: 259.90, img: "/produtos/conjunto21.png", esconderNoTodos: false },
    // --- CONJUNTOS 22, 23, 24 ---
    { nome: "Vestido Midi Terracota Puff Sleeve", categoria: "Vestido", precoAntigo: "R$ 299,90", preco: "R$ 269,90", precoNum: 269.90, img: "/produtos/conjunto22.png", esconderNoTodos: false },
    { nome: "Macacão Pantalona Preto Tie Waist", categoria: "Macacão", precoAntigo: "R$ 369,90", preco: "R$ 339,90", precoNum: 339.90, img: "/produtos/conjunto23.png", esconderNoTodos: false },
    { nome: "Vestido Midi Verde Vibrante Botões", categoria: "Vestido", precoAntigo: "R$ 319,90", preco: "R$ 289,90", precoNum: 289.90, img: "/produtos/conjunto24.png", esconderNoTodos: false },
    // --- CONJUNTOS 25, 26, 27 ---
    { nome: "Regata Um Ombro Floral Verde", categoria: "Blusa", precoAntigo: "R$ 149,90", preco: "R$ 129,90", precoNum: 129.90, img: "/produtos/conjunto25.png", esconderNoTodos: true },
    { nome: "Calça Pantalona Floral Verde Fenda", categoria: "Calça", precoAntigo: "R$ 219,90", preco: "R$ 199,90", precoNum: 199.90, img: "/produtos/conjunto25.png", esconderNoTodos: true },
    { nome: "Cropped Manga 3/4 Verde Escuro", categoria: "Cropped", precoAntigo: "R$ 139,90", preco: "R$ 119,90", precoNum: 119.90, img: "/produtos/conjunto26.png", esconderNoTodos: true },
    { nome: "Saia Midi Verde Escuro Três Marias", categoria: "Saia", precoAntigo: "R$ 199,90", preco: "R$ 179,90", precoNum: 179.90, img: "/produtos/conjunto26.png", esconderNoTodos: true },
    { nome: "Colete Bege com Bordados", categoria: "Blusa", precoAntigo: "R$ 169,90", preco: "R$ 149,90", precoNum: 149.90, img: "/produtos/conjunto27.png", esconderNoTodos: true },
    { nome: "Conjunto Floral Resort (Regata + Calça)", categoria: "Conjunto", precoAntigo: "R$ 369,80", preco: "R$ 329,80", precoNum: 329.80, img: "/produtos/conjunto25.png", esconderNoTodos: false },
    { nome: "Conjunto Verde Elegance (Cropped + Saia)", categoria: "Conjunto", precoAntigo: "R$ 339,80", preco: "R$ 299,80", precoNum: 299.80, img: "/produtos/conjunto26.png", esconderNoTodos: false },
    { nome: "Conjunto Bordado Tropical (Colete + Saia)", categoria: "Conjunto", precoAntigo: "R$ 369,80", preco: "R$ 329,80", precoNum: 329.80, img: "/produtos/conjunto27.png", esconderNoTodos: false },
    // --- CONJUNTOS 28, 29, 30 ---
    { nome: "Vestido Curto Bege Bordado", categoria: "Vestido", precoAntigo: "R$ 229,90", preco: "R$ 199,90", precoNum: 199.90, img: "/produtos/conjunto28.png", esconderNoTodos: false },
    { nome: "Vestido Midi Estampa Folhagem Outono", categoria: "Vestido", precoAntigo: "R$ 279,90", preco: "R$ 249,90", precoNum: 249.90, img: "/produtos/conjunto29.png", esconderNoTodos: false },
    { nome: "Blusa Estampa Folhagem Amarração Frontal", categoria: "Blusa", precoAntigo: "R$ 149,90", preco: "R$ 129,90", precoNum: 129.90, img: "/produtos/conjunto30.png", esconderNoTodos: true },
    { nome: "Calça Pantalona Estampa Folhagem", categoria: "Calça", precoAntigo: "R$ 219,90", preco: "R$ 199,90", precoNum: 199.90, img: "/produtos/conjunto30.png", esconderNoTodos: true },
    { nome: "Conjunto Folhagem Outono (Blusa + Calça)", categoria: "Conjunto", precoAntigo: "R$ 369,80", preco: "R$ 329,80", precoNum: 329.80, img: "/produtos/conjunto30.png", esconderNoTodos: false },
    // --- CONJUNTOS 31, 32, 33 ---
    { nome: "Blusa Alcinha Nude Minimalista", categoria: "Blusa", precoAntigo: "R$ 139,90", preco: "R$ 119,90", precoNum: 119.90, img: "/produtos/conjunto31.png", esconderNoTodos: true },
    { nome: "Blusa Alcinha Marrom Detalhe Pérolas", categoria: "Blusa", precoAntigo: "R$ 149,90", preco: "R$ 129,90", precoNum: 129.90, img: "/produtos/conjunto32.png", esconderNoTodos: true },
    { nome: "Calça Pantalona Marrom Amarração", categoria: "Calça", precoAntigo: "R$ 229,90", preco: "R$ 199,90", precoNum: 199.90, img: "/produtos/conjunto32.png", esconderNoTodos: true },
    { nome: "Vestido Midi Marrom Alcinha Texturizado", categoria: "Vestido", precoAntigo: "R$ 279,90", preco: "R$ 249,90", precoNum: 249.90, img: "/produtos/conjunto33.png", esconderNoTodos: false },
    // --- CONJUNTOS 34, 35, 36 ---
    { nome: "Blusa Bege Lisa com Tachas Laterais", categoria: "Blusa", precoAntigo: "R$ 139,90", preco: "R$ 119,90", precoNum: 119.90, img: "/produtos/conjunto34.png", esconderNoTodos: true },
    { nome: "Calça Pantalona Bege Lisa com Tachas", categoria: "Calça", precoAntigo: "R$ 199,90", preco: "R$ 179,90", precoNum: 179.90, img: "/produtos/conjunto34.png", esconderNoTodos: true },
    { nome: "Conjunto Bege Tachas (Blusa + Calça)", categoria: "Conjunto", precoAntigo: "R$ 339,80", preco: "R$ 299,80", precoNum: 299.80, img: "/produtos/conjunto34.png", esconderNoTodos: false },
    { nome: "Camisa Manga Longa Branca Clássica", categoria: "Blusa", precoAntigo: "R$ 169,90", preco: "R$ 149,90", precoNum: 149.90, img: "/produtos/conjunto35.png", esconderNoTodos: true },
    { nome: "Saia Midi Envelope Bege Amarração", categoria: "Saia", precoAntigo: "R$ 179,90", preco: "R$ 159,90", precoNum: 159.90, img: "/produtos/conjunto35.png", esconderNoTodos: true },
    { nome: "Conjunto Office Casual (Camisa + Saia)", categoria: "Conjunto", precoAntigo: "R$ 349,80", preco: "R$ 309,80", precoNum: 309.80, img: "/produtos/conjunto35.png", esconderNoTodos: false },
    { nome: "Regata Bege Decote V Detalhe Friso", categoria: "Blusa", precoAntigo: "R$ 129,90", preco: "R$ 109,90", precoNum: 109.90, img: "/produtos/conjunto36.png", esconderNoTodos: true },
    { nome: "Saia Midi Evasê Bege Detalhe Friso", categoria: "Saia", precoAntigo: "R$ 189,90", preco: "R$ 169,90", precoNum: 169.90, img: "/produtos/conjunto36.png", esconderNoTodos: true },
    { nome: "Conjunto Bege Friso Branco (Regata + Saia)", categoria: "Conjunto", precoAntigo: "R$ 319,80", preco: "R$ 279,80", precoNum: 279.80, img: "/produtos/conjunto36.png", esconderNoTodos: false },
    // --- CONJUNTOS 37, 38, 39 ---
    { nome: "Blusa Gola Boba Manga Longa Preta", categoria: "Blusa", precoAntigo: "R$ 159,90", preco: "R$ 139,90", precoNum: 139.90, img: "/produtos/conjunto37.png", esconderNoTodos: true },
    { nome: "Calça Pantalona Preta Lisa Elegance", categoria: "Calça", precoAntigo: "R$ 219,90", preco: "R$ 199,90", precoNum: 199.90, img: "/produtos/conjunto37.png", esconderNoTodos: true },
    { nome: "Conjunto Black Elegance (Blusa + Calça)", categoria: "Conjunto", precoAntigo: "R$ 379,80", preco: "R$ 339,80", precoNum: 339.80, img: "/produtos/conjunto37.png", esconderNoTodos: false },
    { nome: "Macacão Pantalona Areia Frente Única com Cinto", categoria: "Macacão", precoAntigo: "R$ 359,90", preco: "R$ 329,90", precoNum: 329.90, img: "/produtos/conjunto38.png", esconderNoTodos: false },
    { nome: "Body Manga Longa Estampa Floral Fundo Escuro", categoria: "Body", precoAntigo: "R$ 149,90", preco: "R$ 129,90", precoNum: 129.90, img: "/produtos/conjunto39.png", esconderNoTodos: false },
    // --- CONJUNTOS 40, 41, 42 ---
    { nome: "Blusa de Linho Areia Botões Frontais", categoria: "Blusa", precoAntigo: "R$ 139,90", preco: "R$ 119,90", precoNum: 119.90, img: "/produtos/conjunto40.png", esconderNoTodos: true },
    { nome: "Shorts de Linho Areia com Bolsos", categoria: "Shorts", precoAntigo: "R$ 149,90", preco: "R$ 129,90", precoNum: 129.90, img: "/produtos/conjunto40.png", esconderNoTodos: true },
    { nome: "Conjunto Areia Linho (Blusa + Shorts)", categoria: "Conjunto", precoAntigo: "R$ 269,90", preco: "R$ 229,90", precoNum: 229.90, img: "/produtos/conjunto40.png", esconderNoTodos: false },
    { nome: "Camisa Estampa Botânica Verde e Creme", categoria: "Blusa", precoAntigo: "R$ 159,90", preco: "R$ 139,90", precoNum: 139.90, img: "/produtos/conjunto41.png", esconderNoTodos: true },
    { nome: "Conjunto Botânico e Areia (Camisa + Shorts)", categoria: "Conjunto", precoAntigo: "R$ 289,90", preco: "R$ 249,90", precoNum: 249.90, img: "/produtos/conjunto41.png", esconderNoTodos: false },
    { nome: "Camisa Azul Paisley Manga Curta", categoria: "Blusa", precoAntigo: "R$ 159,90", preco: "R$ 139,90", precoNum: 139.90, img: "/produtos/conjunto42.png", esconderNoTodos: true },
    { nome: "Shorts Azul Paisley com Amarração", categoria: "Shorts", precoAntigo: "R$ 149,90", preco: "R$ 129,90", precoNum: 129.90, img: "/produtos/conjunto42.png", esconderNoTodos: true },
    { nome: "Conjunto Azul Paisley (Camisa + Shorts)", categoria: "Conjunto", precoAntigo: "R$ 289,90", preco: "R$ 249,90", precoNum: 249.90, img: "/produtos/conjunto42.png", esconderNoTodos: false },
    // --- CONJUNTOS 43, 44, 45 ---
    { nome: "Blusa Branca com Gola Listrada Azul e Detalhes Paisley", categoria: "Blusa", precoAntigo: "R$ 159,90", preco: "R$ 139,90", precoNum: 139.90, img: "/produtos/conjunto43.png", esconderNoTodos: true },
    { nome: "Conjunto Paisley Azul e Branco (Blusa + Shorts)", categoria: "Conjunto", precoAntigo: "R$ 319,80", preco: "R$ 279,80", precoNum: 279.80, img: "/produtos/conjunto43.png", esconderNoTodos: false },
    { nome: "Macaquinho Branco Canelado sem Mangas com Amarração", categoria: "Macacão", precoAntigo: "R$ 299,90", preco: "R$ 269,90", precoNum: 269.90, img: "/produtos/conjunto44.png", esconderNoTodos: false },
    { nome: "Blusa Branca com Gola V e Manga Bufante", categoria: "Blusa", precoAntigo: "R$ 169,90", preco: "R$ 149,90", precoNum: 149.90, img: "/produtos/conjunto45.png", esconderNoTodos: true },
    { nome: "Calça Pantalona Off-White com Estampa Paisley e Cinto", categoria: "Calça", precoAntigo: "R$ 239,90", preco: "R$ 219,90", precoNum: 219.90, img: "/produtos/conjunto45.png", esconderNoTodos: true },
    { nome: "Conjunto Paisley e Branco (Blusa + Calça)", categoria: "Conjunto", precoAntigo: "R$ 419,80", preco: "R$ 379,80", precoNum: 379.80, img: "/produtos/conjunto45.png", esconderNoTodos: false },
    // --- CONJUNTOS 46, 47, 48 ---
    { nome: "Camisa Preta Manga 3/4 Detalhe Botões", categoria: "Blusa", precoAntigo: "R$ 159,90", preco: "R$ 139,90", precoNum: 139.90, img: "/produtos/conjunto46.png", esconderNoTodos: true },
    { nome: "Conjunto All Black (Camisa + Calça)", categoria: "Conjunto", precoAntigo: "R$ 379,80", preco: "R$ 339,80", precoNum: 339.80, img: "/produtos/conjunto46.png", esconderNoTodos: false },
    { nome: "Vestido Midi Preto com Detalhe na Cintura", categoria: "Vestido", precoAntigo: "R$ 299,90", preco: "R$ 269,90", precoNum: 269.90, img: "/produtos/conjunto47.png", esconderNoTodos: false },
    { nome: "Vestido Midi Estampa Abstrata Coral", categoria: "Vestido", precoAntigo: "R$ 299,90", preco: "R$ 269,90", precoNum: 269.90, img: "/produtos/conjunto48.png", esconderNoTodos: false },
    // --- CONJUNTOS 49, 50, 51 ---
    { nome: "Blusa Manga Longa Terracotta Floral", categoria: "Blusa", precoAntigo: "R$ 179,90", preco: "R$ 159,90", precoNum: 159.90, img: "/produtos/conjunto49.png", esconderNoTodos: true },
    { nome: "Saia Midi Plissada Verde Floresta", categoria: "Saia", precoAntigo: "R$ 219,90", preco: "R$ 199,90", precoNum: 199.90, img: "/produtos/conjunto49.png", esconderNoTodos: true },
    { nome: "Conjunto Terracotta Floral (Blusa + Saia Midi Plissada)", categoria: "Conjunto", precoAntigo: "R$ 399,80", preco: "R$ 359,80", precoNum: 359.80, img: "/produtos/conjunto49.png", esconderNoTodos: false },
    { nome: "Macacão Pantalona Navy Manga Curta com Cinto", categoria: "Macacão", precoAntigo: "R$ 329,90", preco: "R$ 299,90", precoNum: 299.90, img: "/produtos/conjunto50.png", esconderNoTodos: false },
    { nome: "Colete Tailored Off-White", categoria: "Blusa", precoAntigo: "R$ 199,90", preco: "R$ 179,90", precoNum: 179.90, img: "/produtos/conjunto51.png", esconderNoTodos: true },
    { nome: "Calça Alfaiataria Reta Off-White", categoria: "Calça", precoAntigo: "R$ 249,90", preco: "R$ 229,90", precoNum: 229.90, img: "/produtos/conjunto51.png", esconderNoTodos: true },
    { nome: "Conjunto Tailored Off-White (Colete + Calça Alfaiataria)", categoria: "Conjunto", precoAntigo: "R$ 449,80", preco: "R$ 399,80", precoNum: 399.80, img: "/produtos/conjunto51.png", esconderNoTodos: false },
    // --- CONJUNTOS 52, 53, 54 ---
    { nome: "Camisa Resort Manga Curta Estampa Geométrica Tile", categoria: "Blusa", precoAntigo: "R$ 199,90", preco: "R$ 179,90", precoNum: 179.90, img: "/produtos/conjunto52.png", esconderNoTodos: true },
    { nome: "Calça Reta Estampa Geométrica Tile matching", categoria: "Calça", precoAntigo: "R$ 249,90", preco: "R$ 219,90", precoNum: 219.90, img: "/produtos/conjunto52.png", esconderNoTodos: true },
    { nome: "Conjunto Geométrico Tile (Camisa + Calça Reta)", categoria: "Conjunto", precoAntigo: "R$ 449,80", preco: "R$ 399,80", precoNum: 399.80, img: "/produtos/conjunto52.png", esconderNoTodos: false },
    { nome: "Vestido Midi Azul Claro Gola Laço e Babados Tiered", categoria: "Vestido", precoAntigo: "R$ 299,90", preco: "R$ 269,90", precoNum: 269.90, img: "/produtos/conjunto53.png", esconderNoTodos: false },
    { nome: "Vestido Midi Frente Única Halter Estampa Botânica Abstrata", categoria: "Vestido", precoAntigo: "R$ 319,90", preco: "R$ 279,90", precoNum: 279.90, img: "/produtos/conjunto54.png", esconderNoTodos: false },
    // --- CONJUNTOS 55, 56, 57 ---
    { nome: "Blusa Branca Fluida Manga Curta", categoria: "Blusa", precoAntigo: "R$ 139,90", preco: "R$ 119,90", precoNum: 119.90, img: "/produtos/conjunto55.png", esconderNoTodos: true },
    { nome: "Calça Pantalona Branca Lisa", categoria: "Calça", precoAntigo: "R$ 219,90", preco: "R$ 199,90", precoNum: 199.90, img: "/produtos/conjunto55.png", esconderNoTodos: true },
    { nome: "Conjunto Branco Fluido (Blusa + Calça Pantalona)", categoria: "Conjunto", precoAntigo: "R$ 359,80", preco: "R$ 319,80", precoNum: 319.80, img: "/produtos/conjunto55.png", esconderNoTodos: false },
    { nome: "Blusa Branca Detalhe Babados e Pregas", categoria: "Blusa", precoAntigo: "R$ 149,90", preco: "R$ 129,90", precoNum: 129.90, img: "/produtos/conjunto56.png", esconderNoTodos: true },
    { nome: "Calça Pantalona Branca com Recortes em Laise", categoria: "Calça", precoAntigo: "R$ 239,90", preco: "R$ 219,90", precoNum: 219.90, img: "/produtos/conjunto56.png", esconderNoTodos: true },
    { nome: "Conjunto Branco Elegance Laise (Blusa + Calça)", categoria: "Conjunto", precoAntigo: "R$ 389,80", preco: "R$ 349,80", precoNum: 349.80, img: "/produtos/conjunto56.png", esconderNoTodos: false },
    { nome: "Camisa Branca Manga Curta Detalhe Laise", categoria: "Blusa", precoAntigo: "R$ 159,90", preco: "R$ 139,90", precoNum: 139.90, img: "/produtos/conjunto57.png", esconderNoTodos: true },
    { nome: "Shorts Branco em Laise com Amarração", categoria: "Shorts", precoAntigo: "R$ 149,90", preco: "R$ 129,90", precoNum: 129.90, img: "/produtos/conjunto57.png", esconderNoTodos: true },
    { nome: "Conjunto Branco Fresh Laise (Camisa + Shorts)", categoria: "Conjunto", precoAntigo: "R$ 309,80", preco: "R$ 269,80", precoNum: 269.80, img: "/produtos/conjunto57.png", esconderNoTodos: false }
  ];
  
  tamanhos = ['PP', 'P', 'M', 'G', 'GG'];

  modalAtivo = false;
  produtoAtual: any = null;
  tamanhoSelecionado: string | null = null;
  quantidade = 1;

  carrinhoPanelAtivo = false;
  carrinho: any[] = [];

  popupAtivo = false;
  popupMensagem = '';
  popupInputVisible = false;
  popupCancelVisible = false;
  popupInputValue: number = 1;
  acaoConfirmar: () => void = () => {};

  // REFERÊNCIAS DO FIREBASE
  private db: any = null;
  private auth: any = null;
  private fbUserUid: string | null = null;

  private firebaseConfig = {
    apiKey: "AIzaSyDMlwDoXM0hRIix8K4CXmPeJahrAVud7LA",
    authDomain: "loja-charms.firebaseapp.com",
    projectId: "loja-charms",
    storageBucket: "loja-charms.firebasestorage.app",
    messagingSenderId: "76109586584",
    appId: "1:76109586584:web:25403a6853fbe5bc9df0ed"
  };

  async ngOnInit() {
    this.titleService.setTitle("Charm's MV Confecções | Moda Feminina");
    this.metaService.addTags([
      { name: 'description', content: 'Fábrica Charm\'s em Mombaça. Peças femininas que unem elegância, conforto e durabilidade real. Conheça nossa coleção.' },
      { name: 'keywords', content: 'moda feminina, roupas femininas, mombaça, vestido, confecção, fábrica de roupas' },
      { name: 'robots', content: 'index, follow' }
    ]);

    try {
      if (this.firebaseConfig.apiKey !== "SUA_API_KEY") {
        const firebaseApp = initializeApp(this.firebaseConfig);
        this.auth = getAuth(firebaseApp);
        this.db = getFirestore(firebaseApp);

        await signInAnonymously(this.auth);

        onAuthStateChanged(this.auth, async (user: any) => {
          if (user) {
            this.fbUserUid = user.uid;
          }
        });
      } else {
        console.warn('⚠️ As chaves do Firebase não foram preenchidas no código!');
      }
    } catch (e) {
      console.log('Erro ao iniciar Firebase. Rodando localmente.');
    }
  }

  ngAfterViewChecked() {
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }

  // --- LÓGICA DE FILTRAGEM ---
  filtrarPor(categoria: string) {
    this.categoriaSelecionada = categoria;
  }

  get produtosFiltrados() {
    let filtrados = this.produtos;

    if (this.termoBusca.trim() !== '') {
      const termo = this.termoBusca.toLowerCase().trim();
      const ehCategoriaExata = this.categorias.some(cat => cat.toLowerCase() === termo);

      if (ehCategoriaExata) {
        filtrados = filtrados.filter(p => p.categoria.toLowerCase() === termo);
      } else {
        filtrados = filtrados.filter(p => 
          p.nome.toLowerCase().includes(termo) || 
          p.categoria.toLowerCase().includes(termo)
        );
        
        if (this.categoriaSelecionada === 'Todos') {
          filtrados = filtrados.filter(p => !p.esconderNoTodos);
        } else {
          filtrados = filtrados.filter(p => p.categoria === this.categoriaSelecionada);
        }
      }
    } 
    else {
      if (this.categoriaSelecionada === 'Todos') {
        filtrados = filtrados.filter(p => !p.esconderNoTodos);
      } else {
        filtrados = filtrados.filter(p => p.categoria === this.categoriaSelecionada);
      }
    }

    return filtrados;
  }

  irPara(tela: 'loja' | 'login' | 'comprovante' | 'historico') {
    this.telaAtual = tela;
    window.scrollTo(0,0);
    this.cdr.detectChanges();
  }

  alternarModoAuth() {
    this.modoAuth = this.modoAuth === 'login' ? 'cadastro' : 'login';
    this.authEmail = ''; this.authSenha = ''; this.authTelefone = ''; this.erroEmail = false;
  }

  validarEmail() {
    if (!this.authEmail) {
      this.erroEmail = false;
      return;
    }
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    this.erroEmail = !regex.test(this.authEmail);
  }

  // --- LÓGICA GOOGLE ---
  async loginComGoogle() {
    if (!this.auth) return;
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(this.auth, provider);
      const user = result.user;
      const email = user.email;

      if (this.db && email) {
        const docRef = doc(this.db, 'usuarios', email);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          // Usuário já tem cadastro, entra direto
          this.usuarioLogado = docSnap.data();
          this.mostrarPopup("Login efetuado com sucesso!", false, false, () => {
            this.fecharPopup();
            this.irPara('loja');
          });
        } else {
          // Usuário novo via Google: pede os dados que faltam
          this.googleUserTemp = { email: email, nome: user.displayName };
          this.completandoCadastroGoogle = true;
          this.authTelefone = '';
          this.authBairro = '';
          this.authNumero = '';
          this.authComp = '';
          this.cdr.detectChanges();
        }
      }
    } catch (error) {
      console.error("Erro no login com Google", error);
      this.mostrarPopup("Erro ao conectar com o Google.", false, false, () => this.fecharPopup());
    }
  }

  async finalizarCadastroGoogle() {
    if (!this.authBairro || !this.authNumero || !this.authTelefone) {
      this.mostrarPopup("Telefone, Bairro e Número são obrigatórios.", false, false, () => this.fecharPopup());
      return;
    }

    const novoUsuario = {
      email: this.googleUserTemp.email,
      senha: 'google-login', 
      telefone: this.authTelefone,
      bairro: this.authBairro,
      numero: this.authNumero,
      comp: this.authComp
    };

    if (this.db) {
      const docRef = doc(this.db, 'usuarios', novoUsuario.email);
      await setDoc(docRef, novoUsuario);
    }

    this.usuarioLogado = novoUsuario;
    this.completandoCadastroGoogle = false;
    this.googleUserTemp = null;
    
    this.mostrarPopup("Conta criada com sucesso! Bem-vinda à Charm's.", false, false, () => {
      this.fecharPopup();
      this.irPara('loja');
    });
  }

  // --- LÓGICA E-MAIL/SENHA ---
  async executarAuth() {
    this.validarEmail();
    
    if (this.erroEmail || !this.authEmail || !this.authSenha) {
      this.mostrarPopup("Preencha o e-mail e a senha corretamente.", false, false, () => this.fecharPopup());
      return;
    }

    if (this.modoAuth === 'cadastro') {
      if (!this.authBairro || !this.authNumero || !this.authTelefone) {
        this.mostrarPopup("Telefone, Bairro e Número são obrigatórios.", false, false, () => this.fecharPopup());
        return;
      }

      const novoUsuario = {
        email: this.authEmail,
        senha: this.authSenha, 
        telefone: this.authTelefone, // Salva o telefone
        bairro: this.authBairro,
        numero: this.authNumero,
        comp: this.authComp
      };
      
      if (this.db) {
        const docRef = doc(this.db, 'usuarios', this.authEmail);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
           this.mostrarPopup("Este e-mail já está cadastrado. Vá em 'Fazer login'.", false, false, () => this.fecharPopup());
           return;
        }
        
        await setDoc(docRef, novoUsuario);
      }
      
      this.usuarioLogado = novoUsuario;
      this.mostrarPopup("Conta criada com sucesso! Bem-vinda à Charm's.", false, false, () => {
        this.fecharPopup();
        this.irPara('loja');
      });

    } else { // LOGIN
       if (this.db) {
         const docRef = doc(this.db, 'usuarios', this.authEmail);
         const docSnap = await getDoc(docRef);
         
         if (docSnap.exists() && docSnap.data()['senha'] === this.authSenha) {
            this.usuarioLogado = docSnap.data();
            this.mostrarPopup("Login efetuado com sucesso!", false, false, () => {
             this.fecharPopup();
             this.irPara('loja');
           });
         } else {
            this.mostrarPopup("E-mail ou senha incorretos.", false, false, () => this.fecharPopup());
         }
       } else {
         if (this.usuarioLogado && this.usuarioLogado.email === this.authEmail && this.usuarioLogado.senha === this.authSenha) {
           this.mostrarPopup("Login efetuado com sucesso!", false, false, () => {
            this.fecharPopup();
            this.irPara('loja');
          });
         } else {
           this.mostrarPopup("Erro ao conectar com o banco de dados.", false, false, () => this.fecharPopup());
         }
       }
    }
  }

  fazerLogout() {
    this.usuarioLogado = null;
    this.authEmail = '';
    this.authSenha = '';
    this.authTelefone = '';
    this.modoAuth = 'login';
    this.completandoCadastroGoogle = false;
    this.googleUserTemp = null;
    this.mostrarPopup("Você saiu da sua conta.", false, false, () => {
       this.fecharPopup();
       this.irPara('loja');
    });
  }

  iniciarEdicaoEndereco() {
    this.editTelefone = this.usuarioLogado.telefone || '';
    this.editBairro = this.usuarioLogado.bairro;
    this.editNumero = this.usuarioLogado.numero;
    this.editComp = this.usuarioLogado.comp || '';
    this.editandoEndereco = true;
  }

  async salvarEndereco() {
    if (!this.editBairro || !this.editNumero || !this.editTelefone) {
      this.mostrarPopup("Telefone, Bairro e Número são obrigatórios.", false, false, () => this.fecharPopup());
      return;
    }

    this.usuarioLogado.telefone = this.editTelefone;
    this.usuarioLogado.bairro = this.editBairro;
    this.usuarioLogado.numero = this.editNumero;
    this.usuarioLogado.comp = this.editComp;
    this.editandoEndereco = false;

    if (this.db) {
      try {
        const docRef = doc(this.db, 'usuarios', this.usuarioLogado.email);
        await updateDoc(docRef, {
          telefone: this.editTelefone,
          bairro: this.editBairro,
          numero: this.editNumero,
          comp: this.editComp
        });
        this.mostrarPopup("Endereço atualizado com sucesso!", false, false, () => this.fecharPopup());
      } catch (e) {
        console.error("Erro ao atualizar o endereço no banco:", e);
      }
    }
  }

  async abrirHistorico() {
    if (!this.usuarioLogado) return;
    this.irPara('historico');
    this.carregandoHistorico = true;
    this.historicoPedidos = [];

    if (this.db) {
      try {
        const pedidosRef = collection(this.db, 'pedidos');
        const q = query(pedidosRef, where("clienteEmail", "==", this.usuarioLogado.email));
        const querySnapshot = await getDocs(q);
        
        const pedidosEncontrados: any[] = [];
        querySnapshot.forEach((doc) => {
          pedidosEncontrados.push({ id: doc.id, ...doc.data() });
        });

        pedidosEncontrados.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
        this.historicoPedidos = pedidosEncontrados;
      } catch (e) {
        console.error("Erro ao buscar histórico:", e);
      }
    }
    this.carregandoHistorico = false;
    this.cdr.detectChanges();
  }

  abrirModalProduto(produto: any) {
    this.produtoAtual = produto;
    this.quantidade = 1;
    this.tamanhoSelecionado = null;
    this.modalAtivo = true;
  }
  fecharModalProduto() { this.modalAtivo = false; }
  selecionarTamanho(tamanho: string) { this.tamanhoSelecionado = tamanho; }
  alterarQuantidade(valor: number) { if (this.quantidade + valor > 0) this.quantidade += valor; }

  adicionarAoCarrinho() {
    if (!this.tamanhoSelecionado) {
      this.mostrarPopup("Por favor, selecione um tamanho.", false, false, () => this.fecharPopup());
      return;
    }
    const itemExistente = this.carrinho.find(item => item.nome === this.produtoAtual.nome && item.tamanho === this.tamanhoSelecionado);
    if (itemExistente) {
      itemExistente.qtd += this.quantidade;
    } else {
      this.carrinho.push({
        nome: this.produtoAtual.nome, precoStr: this.produtoAtual.preco,
        precoNum: this.produtoAtual.precoNum, tamanho: this.tamanhoSelecionado, qtd: this.quantidade
      });
    }
    this.fecharModalProduto();
    this.carrinhoPanelAtivo = true;
  }

  removerItem(index: number) { this.carrinho.splice(index, 1); }

  editarQuantidade(index: number) {
    this.popupInputValue = this.carrinho[index].qtd;
    this.mostrarPopup("Digite a nova quantidade:", true, true, () => {
      if (this.popupInputValue > 0) this.carrinho[index].qtd = this.popupInputValue;
      this.fecharPopup();
    });
  }

  esvaziarCarrinho() { this.carrinho = []; }

  get totalItensCarrinho() { return this.carrinho.reduce((acc, item) => acc + item.qtd, 0); }
  get valorTotalGeralFormatado() {
    const total = this.carrinho.reduce((acc, item) => acc + (item.precoNum * item.qtd), 0);
    return total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  async finalizarCompra() {
    if(!this.usuarioLogado) {
        this.mostrarPopup("Faça login ou cadastre-se para finalizar a compra e informar o endereço de entrega.", false, false, () => {
            this.fecharPopup();
            this.carrinhoPanelAtivo = false;
            this.irPara('login');
        });
        return;
    }

    if (this.carrinho.length === 0) return;

    const itensComprados = JSON.parse(JSON.stringify(this.carrinho));
    const totalComprado = this.valorTotalGeralFormatado;

    this.pedidoRecente = {
      clienteEmail: this.usuarioLogado.email,
      clienteTelefone: this.usuarioLogado.telefone, // Salva no pedido pra facilitar o contato
      enderecoEntrega: `${this.usuarioLogado.bairro}, Nº ${this.usuarioLogado.numero} ${this.usuarioLogado.comp ? '- Comp: ' + this.usuarioLogado.comp : ''}`,
      itens: itensComprados,
      totalFormatado: totalComprado,
      data: new Date().toISOString(),
      status: 'Aguardando Pagamento' 
    };

    this.carrinho = [];
    this.carrinhoPanelAtivo = false;
    this.irPara('comprovante');

    if (this.db) {
      try {
        const pedidosRef = collection(this.db, 'pedidos');
        await addDoc(pedidosRef, this.pedidoRecente);
      } catch (e) {
        console.error("Erro ao salvar pedido na nuvem: ", e);
      }
    }
  }

  mostrarPopup(mensagem: string, mostrarInput: boolean, mostrarCancel: boolean, acao: () => void) {
    this.popupMensagem = mensagem;
    this.popupInputVisible = mostrarInput;
    this.popupCancelVisible = mostrarCancel;
    this.acaoConfirmar = acao;
    this.popupAtivo = true;
    this.cdr.detectChanges();
  }
  fecharPopup() { this.popupAtivo = false; this.cdr.detectChanges(); }
  abrirAviso(tipo: string) {
    let msg = tipo === 'trocas' 
      ? "Você tem até 7 dias após o recebimento para solicitar troca."
      : "Entregas em até 24h úteis para toda Mombaça.";
    this.mostrarPopup(msg, false, false, () => this.fecharPopup());
  }
}