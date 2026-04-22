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
/**
 *
 * @author juuli
 */
public class ReservaService {
    
    // --- NOVO MÉTODO PARA VERIFICAR CONFLITOS ---
    public boolean existeConflito(Reserva novaReserva) {
        // A lógica: existe conflito se (Início1 < Fim2) E (Fim1 > Início2)
        String sql = "SELECT COUNT(*) FROM reserva WHERE IdSala = ? AND dataReserva = ? "
                   + "AND (horaInicio < ? AND horaFim > ?)";

        try (Connection conn = ConexaoSQLite.conectar();
             PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.setString(1, novaReserva.getIdSala());
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
      
        if (existeConflito(novaReserva)) {
            System.out.println("ERRO: Já existe uma reserva para esta sala neste horário!");
            return; // Interrompe o método e não salva
        }
        
        // Comando SQL para inserir os dados (os ? são os espaços que vamos preencher)
        String sql = "INSERT INTO reserva (id, IdSala, identificacaoCadastro, dataReserva, horaInicio, horaFim) VALUES (?, ?, ?, ?, ?, ?)";

        try (Connection conn = ConexaoSQLite.conectar();
             PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.setString(1, novaReserva.getId());
            pstmt.setString(2, novaReserva.getIdSala());
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
                System.out.println("ID Reserva: " + rs.getString("id") + 
                                   " | Sala: " + rs.getString("idSala") + 
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
    public void cancelarReserva(String idReserva) {
        // Comando SQL para deletar a linha específica
        String sql = "DELETE FROM reserva WHERE id = ?";

        try (Connection conn = ConexaoSQLite.conectar();
             PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.setString(1, idReserva);

            // executeUpdate retorna o número de linhas afetadas
            int linhasAfetadas = pstmt.executeUpdate();

            if (linhasAfetadas > 0) {
                System.out.println("Sucesso: Reserva " + idReserva + " foi cancelada!");
            } else {
                System.out.println("Aviso: Nenhuma reserva encontrada com o ID: " + idReserva);
            }

        } catch (Exception e) {
            System.out.println("Erro ao cancelar reserva: " + e.getMessage());
        }
    }
}