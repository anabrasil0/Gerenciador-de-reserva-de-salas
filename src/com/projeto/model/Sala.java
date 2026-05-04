/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package com.projeto.model;

/**
 *
 * @author juuli
 */
public class Sala {
    
    private String id;
    private String localizacao; //a localização sera o id da sala
    private String tipo;           //sala de aula, laboratório
    private Boolean possuiComputadores;


    public Sala() {
    }

    // --- GETTERS E SETTERS -

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }
    
    public String getLocalizacao() {
        return localizacao;
    }

    public void setLocalizacao(String localizacao) {
        this.localizacao = localizacao;
    }

    public String getTipo() {
        return tipo;
    }

    public void setTipo(String tipo) {
        this.tipo = tipo;
    }

    public Boolean getPossuiComputadores() {
        return possuiComputadores;
    }

    public void setPossuiComputadores(Boolean possuiComputadores) {
        this.possuiComputadores = possuiComputadores;
    }    
}
