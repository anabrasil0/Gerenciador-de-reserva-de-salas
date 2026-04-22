package com.projeto.service;

/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
import com.projeto.model.Sala;
import com.projeto.service.ConexaoSQLite;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
/**
 *
 * @author juuli
 */
public class SalaService {
    public void cadastrarSala(Sala novaSala) {
        // O comando SQL INSERT ensina onde cada dado vai entrar (os ? são espaços vazios)
        String sql = "INSERT INTO sala (id, nome, localizacao, tipo, possuiComputadores) VALUES (?, ?, ?, ?, ?)";

        try (Connection conn = ConexaoSQLite.conectar();
             PreparedStatement pstmt = conn.prepareStatement(sql)) {

            // Preenchendo os ? com os dados do objeto novaSala
            pstmt.setString(1, novaSala.getId());
            pstmt.setString(2, novaSala.getNome());
            pstmt.setString(3, novaSala.getLocalizacao());
            pstmt.setString(4, novaSala.getTipo());
            pstmt.setBoolean(5, novaSala.getPossuiComputadores());

            // Executa o salvamento
            pstmt.executeUpdate();
            System.out.println("Sucesso: Sala salva no BANCO DE DADOS!");

        } catch (Exception e) {
            System.out.println("Erro ao salvar sala no banco: " + e.getMessage());
        }
    }

    public void listarSalas() {
        System.out.println("\n--- Lista de Salas no Banco de Dados ---");
        // Comando SQL SELECT puxa tudo da tabela
        String sql = "SELECT * FROM sala";

        try (Connection conn = ConexaoSQLite.conectar();
             PreparedStatement pstmt = conn.prepareStatement(sql);
             ResultSet rs = pstmt.executeQuery()) {

            // O while(rs.next()) percorre linha por linha dos resultados do banco
            while (rs.next()) {
                String temPc = rs.getBoolean("possuiComputadores") ? "Sim" : "Não";
                System.out.println("ID: " + rs.getString("id") + 
                                   " | Nome: " + rs.getString("nome") + 
                                   " | Local: " + rs.getString("localizacao") + 
                                   " | Tipo: " + rs.getString("tipo") +
                                   " | PC: " + temPc);
            }
        } catch (Exception e) {
            System.out.println("Erro ao buscar salas: " + e.getMessage());
        }
        System.out.println("----------------------------------------\n");
    }
    
    public String buscarIdPorLocalizacao(String localizacao) {
        String sql = "SELECT id FROM sala WHERE localizacao = ?";

        try (Connection conn = ConexaoSQLite.conectar();
             PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.setString(1, localizacao);

            try (ResultSet rs = pstmt.executeQuery()) {
                if (rs.next()) {
                    return rs.getString("id"); // Retorna o ID (ex: S01)
                }
            }
        } catch (Exception e) {
            System.out.println("Erro ao buscar sala: " + e.getMessage());
        }
        return null; // Se não achar nada, retorna null
    }
}
