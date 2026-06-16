package com.projeto.main;

import com.projeto.model.Cadastro;
import com.projeto.model.Reserva;
import com.projeto.model.Sala;
import com.projeto.service.CadastroService;
import com.projeto.service.ConexaoSQLite;
import com.projeto.service.ReservaService;
import com.projeto.service.SalaService;
import java.util.Scanner;

public class main {

    public static void main(String[] args) {
        
        ConexaoSQLite.criarTabelas();
        
        Scanner teclado = new Scanner(System.in);
        ReservaService reservaService = new ReservaService();
        SalaService salaService = new SalaService();
        CadastroService cadastroService = new CadastroService(); // Novo service!
        
        int opcao = -1;

        while (opcao != 0) {
            System.out.println("\n=== BEM-VINDO AO SISTEMA DE RESERVAS ===");
            System.out.println("1 - Cadastrar nova sala");
            System.out.println("2 - Listar salas cadastradas");
            System.out.println("3 - Cadastrar nova reserva");
            System.out.println("4 - Listar reservas feitas");
            System.out.println("5 - Cadastrar novo usuário (Cadastro)");
            System.out.println("6 - Listar usuários");
            System.out.println("7 - Cancelar Reserva");
            System.out.println("0 - Sair do sistema");
            System.out.print("Escolha uma opção: ");
            
            try {
                opcao = Integer.parseInt(teclado.nextLine());
            } catch (NumberFormatException e) {
                System.out.println("Por favor, digite um número válido.");
                continue;
            }

            switch (opcao) {
                case 1:
                    // 1. PRIMEIRA COISA: Pede o e-mail para validação
                    System.out.print("Digite o seu e-mail para validar o acesso: ");
                    String emailParaVerificar = teclado.nextLine();

                    // 2. Busca o usuário completo direto do banco de dados
                    Cadastro novoUsuario = cadastroService.buscarUsuarioPorEmail(emailParaVerificar);

                    // 3. VALIDAÇÃO ANTECIPADA: Se o usuário não existir ou não for ADMIN, já barra aqui
                    if (novoUsuario == null || novoUsuario.getTipo() == null || !novoUsuario.getTipo().equalsIgnoreCase("ADMIN")) {
                        System.out.println("❌ ACESSO NEGADO: Apenas administradores podem cadastrar salas!");
                        break; // Sai do case 1 imediatamente e volta para o menu principal
                    }

                    // 4. Se passou pela validação (é ADMIN), o sistema faz as perguntas da sala
                    System.out.println("✅ Acesso concedido! Proseguindo com o cadastro da sala...");
                    Sala minhaSala = new Sala();
                    System.out.print("Digite a localização (ex: sala cb-202): ");
                    minhaSala.setLocalizacao(teclado.nextLine());
                    System.out.print("Digite o tipo (ex: laboratório, sala de aula): ");
                    minhaSala.setTipo(teclado.nextLine());
                    System.out.print("A sala possui computadores? (true/false): ");
                    minhaSala.setPossuiComputadores(Boolean.parseBoolean(teclado.nextLine()));

                    // Enviamos a sala criada e o usuário encontrado para o seu método validar
                    salaService.cadastrarSala(minhaSala, novoUsuario);
                    break;
                    
                case 2:
                    salaService.listarSalas();
                    break;

                case 3:
                    Reserva minhaReserva = new Reserva();
    
                    System.out.print("Digite a LOCALIZAÇÃO da sala (ex: sala cb-202): ");
                    String localizacaoDigitada = teclado.nextLine();

                    // Chamamos um novo método para buscar o ID da sala por localização
                    String idEncontrado = salaService.buscarIdPorLocalizacao(localizacaoDigitada);

                    if (idEncontrado == null) {
                        System.out.println("ERRO: Nenhuma sala encontrada na localização: " + localizacaoDigitada);
                        break; // Interrompe e volta para o menu
                    }

                    minhaReserva.setLocalizacao(idEncontrado);

                    // O restante continua igual...
                    System.out.print("Digite a sua identificação de usuário: ");
                    minhaReserva.setIdentificacaoCadastro(teclado.nextLine());

                    System.out.print("Digite a data (ex: 10/10/2026): ");
                    minhaReserva.setDataReserva(teclado.nextLine());

                    System.out.print("Digite a hora de início (ex: 14:00): ");
                    minhaReserva.setHoraInicio(teclado.nextLine());

                    System.out.print("Digite a hora de fim (ex: 16:00): ");
                    minhaReserva.setHoraFim(teclado.nextLine());

                    reservaService.cadastrarReserva(minhaReserva);
                    break;
                    
                case 4:
                    reservaService.listarReservas();
                    break;

                case 5:
                    Cadastro meuCadastro = new Cadastro();
                    System.out.print("Digite o email: ");
                    meuCadastro.setEmail(teclado.nextLine());
                    System.out.print("Digite sua identificação (sou Aluno ou professor): ");
                    meuCadastro.setTipo(teclado.nextLine());

                    cadastroService.cadastrarUsuario(meuCadastro);
                    break;
                    
                case 6:
                    cadastroService.listarUsuarios();
                    break;
                    
                case 7: // <-- O "Botão" de cancelar
                    System.out.println("\n--- Cancelamento de Reserva ---");
                    // É bom listar antes para o usuário ver o ID que quer apagar
                    reservaService.listarReservas(); 
                    
                    System.out.print("Digite o ID da reserva que deseja cancelar: ");
                    String idParaCancelar = teclado.nextLine();

                    // Chamando o método que criamos na ReservaService
                    reservaService.cancelarReserva(idParaCancelar);
                    break;
                    
                case 0:
                    System.out.println("Saindo do sistema... Até logo!");
                    break;
                    
                default:
                    System.out.println("Opção inválida! Tente novamente.");
            }
        }
        
        teclado.close();
    }
}
