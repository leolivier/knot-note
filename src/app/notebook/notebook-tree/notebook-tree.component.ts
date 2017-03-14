import { Component, OnInit, AfterViewInit, ViewChild, EventEmitter, Output } from '@angular/core';
import { Router, ActivatedRoute, Params } from '@angular/router';
import { Location } from '@angular/common';

import { TreeComponent, TreeNode } from 'angular2-tree-component';
import { Notebook } from '../../notebook';
import { Note } from '../../note';
import { NoteService } from '../../note.service';
import { NotebookShowComponent } from '../notebook-show/notebook-show.component';

import { TREE_ACTIONS, KEYS, IActionMapping } from 'angular2-tree-component';

const actionMapping:IActionMapping = {
  mouse: {
    dblClick: (tree, node, $event) => {
      //if (node.hasChildren) TREE_ACTIONS.TOGGLE_EXPANDED(tree, node, $event);
      this.startEdition(node.data.id);
    },
  },
  keys: {
    127: (tree, node, $event) => this.deleteNotebook($event, node.data),
  }
}

@Component({
  moduleId: module.id,
  selector: 'app-notebook-tree',
  templateUrl: './notebook-tree.component.html',
  styleUrls: ['./notebook-tree.component.css']
})
export class NotebookTreeComponent implements OnInit, AfterViewInit {

  private _editableNodeId: number = -1;
  private _initialName: string = "";

  @Output() onSelectedNotebook = new EventEmitter<Notebook>();

  // inject the TreeComponent
  @ViewChild(TreeComponent)
  private notebookTree: TreeComponent;
  
  // the notebook tree
  rootNotebook: Notebook[];
  selectedNotebook: Notebook;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private location: Location,
    private noteService: NoteService) {
  // creates a pseudo tree (or else the TreeComponent won't update)
    this.setRoot(new Notebook({ id: 1, name: '/' }));
  }

  // load the notebook tree at init
  ngOnInit() {
    this.noteService.getRootNotebook()
      .then(notebook => this.setRoot(notebook))
      .then(()=>this.notebookTree.treeModel.getFirstRoot().setActiveAndVisible());
  }

  ngAfterViewInit() {
//    setTimeout(() => this.notebookTree.treeModel.expandAll());
//    this.notebookTree.treeModel.getFirstRoot().setActiveAndVisible();
  }

  // set the data in the node tree (as an array because this is the way the TreeComponent wants it)
  setRoot(root: Notebook): void {
    this.expandAll(root);
    this.rootNotebook = [root];
    this.selectedNotebook = root;
  }

  selectNotebook($event) {
    this.selectedNotebook = $event.node.data;
    this.onSelectedNotebook.emit(this.selectedNotebook);
  }

  isEditable(id: number): boolean {
    return (id == this._editableNodeId);
  }

  startEdition(id: number): void {
    this._editableNodeId = id;
    let n = this.findNodeById(this.notebookTree.treeModel.getFirstRoot(), id);
    if (n) {
      this._initialName = n.data.name;
      n.setActiveAndVisible();
    }
  }

// expandAll not taken into account so rewrite it
  expandAll(nb: Notebook) {
    let that = this;
    nb['isExpanded'] = true;
    if (nb.children && Array.isArray(nb.children)) nb.children.forEach((c)=>that.expandAll(c));
  }

  cancelEdition(id: number): void {
    if (this._editableNodeId == id) {
      let n = this.rootNotebook[0].findById(this._editableNodeId);
      n.name = this._initialName;
      let nt = this.findNodeById(this.notebookTree.treeModel.getFirstRoot(), id);
      nt.data.name = this._initialName;
      this._editableNodeId = -1;
      this._initialName = "";
      this.notebookTree.treeModel.update();    
    }
  }

  toggleEdition(id: number): void {
    if (this._editableNodeId == id) this.cancelEdition(id);
    else this.startEdition(id);
  }

  endEdition(): void {
    this._editableNodeId = -1;
    this._initialName = "";
    // save the notebook tree
    this.noteService.updateRootNotebook(this.rootNotebook[0]);
    // now update display and focus on new node
    this.notebookTree.treeModel.update();    
  }

  checkEndEdition($event): void {
    if ($event.key === "Enter") this.endEdition();
  }

  getId(): number {
    return Math.ceil(Math.random()*10000000);
  }

  addNotebook($event, nodedata: Notebook) {
    $event.stopPropagation();
    // create a default new node with a random id and a predefined name
    const newid = this.getId();
    const newnb = new Notebook({ id: newid, name: "new notebook" });
    // add it to the children in the current node
    newnb.parent = nodedata;
    nodedata.children.push(newnb);
    // save the notebook tree
    this.noteService.updateRootNotebook(this.rootNotebook[0]);
    // now update display and focus on new node
    this.notebookTree.treeModel.update();
    this.startEdition(newid);
  }

  deleteNotebook($event, nodedata) {
    // TODO: Add a confirmation before actually deleting.
    // TODO: If confirmed, ask if notes and subtree must be deleted also
    // remove in the parent node the node having the current node id
    nodedata.parent.children = nodedata.parent.children.filter((c) => c.id != nodedata.id);
    // update the display
    this.notebookTree.treeModel.update();
    // save the notebook tree
    this.noteService.updateRootNotebook(this.rootNotebook[0]);
  }

  // find a tree node by its id (recursively) or null if the id is not found
  findNodeById(from: TreeNode, id: number): TreeNode {
    if (from.id == id) return from;
    else if (from.children && from.children.length > 0) {
      for (let c of from.children) {
        let r = this.findNodeById(c, id);
        if (r) return r;
      }
    }
    return null;
  }

   customTemplateStringOptions = {
    // displayField: 'subTitle',
    actionMapping,
//    nodeHeight: 23,
    allowDrag: true,
    allowDrop: true
  }
}