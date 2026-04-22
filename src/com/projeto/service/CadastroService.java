package com.projeto.service;

import com.projeto.model.Cadastro;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;

public class CadastroService {

    public void cadastrarUsuario(Cadastro novoUsuario) {
        String sql = "INSERT INTO cadastro (email, tipo) VALUES (?, ?)"; //cadastrar linha na tabela cadastro no banco de dados

        try (Connection conn = ConexaoSQLite.conectar();
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            
            pstmt.setString(1, novoUsuario.getEmail());
            pstmt.setString(2, novoUsuario.getTipo());

            pstmt.executeUpdate();
            System.out.println("Sucesso: Usuário salvo no BANCO DE DADOS!");

        } catch (Exception e) {
            System.out.println("Erro ao salvar usuário: " + e.getMessage());
        }
    }

    public void listarUsuarios() { //faz uma lista de usuários já cadastrados
        System.out.println("\n--- Lista de Usuários Cadastrados ---");
        String sql = "SELECT * FROM cadastro";

        try (Connection conn = ConexaoSQLite.conectar();
             PreparedStatement pstmt = conn.prepareStatement(sql);
             ResultSet rs = pstmt.executeQuery()) {

            while (rs.next()) { //vai para a próxima linha de usuário
                System.out.println("email: " + rs.getString("email") + 
                                   " | Tipo: " + rs.getString("professor"));
            }
        } catch (Exception e) {
            System.out.println("Erro ao buscar usuários: " + e.getMessage());
        }
        System.out.println("-------------------------------------\n");
    }
}