/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package com.projeto.service;
import com.projeto.model.Reserva;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
/**
 *
 * @author juuli
 */
public class ReservaService {
    
    // --- NOVO MÉTODO PARA VERIFICAR CONFLITOS ---
    public boolean existeConflito(Reserva novaReserva) {
        // A lógica: existe conflito se (Início1 < Fim2) E (Fim1 > Início2)
        String sql = "SELECT COUNT(*) FROM reserva WHERE id = ? AND dataReserva = ? "
                   + "AND (horaInicio < ? AND horaFim > ?)";

        try (Connection conn = ConexaoSQLite.conectar();
             PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.setString(1, novaReserva.getId());
            pstmt.setString(2, novaReserva.getDataReserva());
            pstmt.setString(3, novaReserva.getHoraFim());    // Fim da nova
            pstmt.setString(4, novaReserva.getHoraInicio()); // Início da nova

            try (ResultSet rs = pstmt.executeQuery()) {
                if (rs.next()) {
                    int total = rs.getInt(1);
                    return total > 0; // Se for maior que 0, há conflito
                }
            }
        } catch (Exception e) {
            System.out.println("Erro ao verificar conflito: " + e.getMessage());
        }
        return false;
    }
    
// Método para salvar a reserva no banco
    public void cadastrarReserva(Reserva novaReserva) {
      
        final int LIMITE_TOTAL = 10; // Limite máximo de reservas simultâneas no sistema

        // 1. Validar o limite TOTAL do usuário
        int totalReservas = contarTotalReservasUsuario(novaReserva.getIdentificacaoCadastro());

        if (totalReservas >= LIMITE_TOTAL) {
            System.out.println("ERRO: O usuário " + novaReserva.getIdentificacaoCadastro() + 
                               " já atingiu o limite máximo de " + LIMITE_TOTAL + " reservas no sistema!");
            return; // Interrompe o cadastro
        }
        
        // Comando SQL para inserir os dados (os ? são os espaços que vamos preencher)
        String sql = "INSERT INTO reserva (id, localizacao, identificacaoCadastro, dataReserva, horaInicio, horaFim) VALUES (?, ?, ?, ?, ?, ?)";

        try (Connection conn = ConexaoSQLite.conectar();
             PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.setString(1, novaReserva.getId());
            pstmt.setString(2, novaReserva.getLocalizacao());
            pstmt.setString(3, novaReserva.getIdentificacaoCadastro());
            pstmt.setString(4, novaReserva.getDataReserva());
            pstmt.setString(5, novaReserva.getHoraInicio());
            pstmt.setString(6, novaReserva.getHoraFim());

            // Executa o salvamento no banco
            pstmt.executeUpdate();
            System.out.println("Sucesso: Reserva salva no BANCO DE DADOS!");

        } catch (Exception e) {
            System.out.println("Erro ao salvar reserva no banco: " + e.getMessage());
        }
    }

    // Método para listar as reservas do banco
    public void listarReservas() {
        System.out.println("\n--- Lista de Reservas no Banco de Dados ---");
        // Comando SQL para buscar todas as reservas
        String sql = "SELECT * FROM reserva";

        try (Connection conn = ConexaoSQLite.conectar();
             PreparedStatement pstmt = conn.prepareStatement(sql);
             ResultSet rs = pstmt.executeQuery()) {

            // Percorre cada linha que o banco devolveu
            while (rs.next()) {
                System.out.println("Id: " + rs.getString("id") +  
                                   " | Localizacao: " + rs.getString("localizacao") +
                                   " | Usuário: " + rs.getString("identificacaoCadastro") +
                                   " | Data: " + rs.getString("dataReserva") + 
                                   " | Horário: " + rs.getString("horaInicio") + " às " + rs.getString("horaFim"));
            }
        } catch (Exception e) {
            System.out.println("Erro ao buscar reservas: " + e.getMessage());
        }
        System.out.println("-------------------------------------------\n");
    }   
    
    // Método para excluir uma reserva pelo ID
    public void cancelarReserva(String id) {
        // Comando SQL para deletar a linha específica
        String sql = "DELETE FROM reserva WHERE id = ?";

        try (Connection conn = ConexaoSQLite.conectar();
             PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.setString(1, id);

            // executeUpdate retorna o número de linhas afetadas
            int linhasAfetadas = pstmt.executeUpdate();

            if (linhasAfetadas > 0) {
                System.out.println("Sucesso: Reserva " + id + " foi cancelada!");
            } else {
                System.out.println("Aviso: Nenhuma reserva encontrada com o ID: " + id);
            }

        } catch (Exception e) {
            System.out.println("Erro ao cancelar reserva: " + e.getMessage());
        }
    }

    private int contarTotalReservasUsuario(String usuarioId) {
        // SQL super simples: Conta tudo que pertence a este usuário
        String sql = "SELECT COUNT(*) FROM reserva WHERE identificacaoCadastro = ?";

        try (Connection conn = ConexaoSQLite.conectar();
             PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.setString(1, usuarioId);

            try (ResultSet rs = pstmt.executeQuery()) {
                if (rs.next()) {
                    return rs.getInt(1); // Retorna o total de reservas da pessoa
                }
            }
        } catch (SQLException e) {
            System.err.println("Erro ao contar total de reservas: " + e.getMessage());
        }
        return 0;
    }
}
